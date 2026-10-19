// Shared security layer for the GitHub and AI proxies (server.js and the Vite
// telemetry gateway). Every request must be signed in, may only reach an
// allowlisted GitHub endpoint and method, and uses only the keys of the
// project that owns the target repo. Nothing falls back to another project's
// keys or to placeholder keys.

import { timingSafeEqual } from 'node:crypto';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const NAME = '[A-Za-z0-9_.-]+';
const SHA = '[0-9a-f]{40}';
const REF = '[A-Za-z0-9_./%-]+';

// Exactly the GitHub calls GitHubClient (src/lib/github.ts) makes.
export const GITHUB_ALLOWLIST = [
  { method: 'GET', path: new RegExp(`^/repos/(${NAME})/(${NAME})$`) },
  { method: 'GET', path: new RegExp(`^/repos/(${NAME})/(${NAME})/commits$`) },
  { method: 'GET', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/trees/${SHA}$`) },
  { method: 'GET', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/blobs/${SHA}$`) },
  { method: 'GET', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/commits/${SHA}$`) },
  { method: 'GET', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/refs/heads/${REF}$`) },
  { method: 'POST', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/blobs$`) },
  { method: 'POST', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/trees$`) },
  { method: 'POST', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/commits$`) },
  { method: 'PATCH', path: new RegExp(`^/repos/(${NAME})/(${NAME})/git/refs/heads/${REF}$`) },
];

const ALLOWED_QUERY = new Set(['sha', 'per_page', 'page', 'recursive']);
const FORWARDED_HEADERS = new Set(['accept', 'x-github-api-version']);

export class ProxyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function envKey(projectId, suffix) {
  return `${projectId.toUpperCase().replace(/-/g, '_')}_${suffix}`;
}

/**
 * Reads per-project credentials from the environment.
 *   PROXY_PROJECTS=proj-ehi-001,proj-iya-001
 *   PROJ_EHI_001_GITHUB_TOKEN=...            (required)
 *   PROJ_EHI_001_GITHUB_REPOS=owner/repo,... (required)
 *   PROJ_EHI_001_OPENAI_API_KEY=...          (optional)
 *   PROJ_EHI_001_ANTHROPIC_API_KEY=...       (optional)
 * Returns { projects, errors }; callers decide whether errors are fatal.
 */
export function loadProjectCredentials(env = process.env) {
  const errors = [];
  const projects = new Map();
  const ids = (env.PROXY_PROJECTS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) errors.push('PROXY_PROJECTS is not set (comma-separated project ids).');

  for (const id of ids) {
    if (!ID_PATTERN.test(id)) {
      errors.push(`Invalid project id "${id}" in PROXY_PROJECTS.`);
      continue;
    }
    const githubToken = env[envKey(id, 'GITHUB_TOKEN')] || '';
    const repos = (env[envKey(id, 'GITHUB_REPOS')] || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!githubToken) errors.push(`${envKey(id, 'GITHUB_TOKEN')} is missing.`);
    if (repos.length === 0) errors.push(`${envKey(id, 'GITHUB_REPOS')} is missing.`);
    projects.set(id, {
      id,
      githubToken,
      repos: new Set(repos),
      openaiApiKey: env[envKey(id, 'OPENAI_API_KEY')] || '',
      anthropicApiKey: env[envKey(id, 'ANTHROPIC_API_KEY')] || '',
    });
  }

  const owners = new Map();
  for (const p of projects.values()) {
    for (const r of p.repos) {
      if (owners.has(r)) errors.push(`Repo ${r} is assigned to both ${owners.get(r)} and ${p.id}.`);
      owners.set(r, p.id);
    }
  }
  return { projects, errors };
}

// The Vite dev server (port 3000) may be opened as localhost or 127.0.0.1.
export const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

/**
 * Auth settings. Exactly one mode must be configured:
 *   - Supabase: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_ equivalents);
 *     the bearer token must be a valid Supabase session.
 *   - Shared key: PROXY_API_KEY; the bearer token must equal it (scripts, CI).
 *   - PROXY_AUTH_MODE=local-dev: no token, but only loopback callers.
 */
export function loadAuthConfig(env = process.env) {
  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  const apiKey = env.PROXY_API_KEY || '';
  const localDev = env.PROXY_AUTH_MODE === 'local-dev';
  const listed = (env.PROXY_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = listed.length ? listed : DEFAULT_ALLOWED_ORIGINS;
  const errors = [];
  if (!(supabaseUrl && supabaseAnonKey) && !apiKey && !localDev) {
    errors.push('No proxy auth configured: set SUPABASE_URL + SUPABASE_ANON_KEY, PROXY_API_KEY, or PROXY_AUTH_MODE=local-dev.');
  }
  return { supabaseUrl, supabaseAnonKey, apiKey, localDev, allowedOrigins, errors };
}

function bearer(headers) {
  const raw = headers.authorization || headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(Array.isArray(raw) ? raw[0] : raw);
  return m ? m[1].trim() : '';
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isLoopback(addr = '') {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

const sessionCache = new Map();
const SESSION_TTL_MS = 60_000;

/** Throws ProxyError(401) unless the caller is signed in. */
export async function authenticate(auth, headers, remoteAddress, fetchImpl = fetch) {
  const token = bearer(headers);

  if (token && auth.apiKey && safeEqual(token, auth.apiKey)) return { kind: 'api-key' };

  if (token && auth.supabaseUrl && auth.supabaseAnonKey) {
    const cached = sessionCache.get(token);
    if (cached && cached.expires > Date.now()) return cached.user;
    const res = await fetchImpl(`${auth.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: auth.supabaseAnonKey, Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const user = { kind: 'supabase', id: data.id, email: data.email };
      sessionCache.set(token, { user, expires: Date.now() + SESSION_TTL_MS });
      return user;
    }
  }

  // local-dev already admits tokenless loopback callers, so a token that isn't
  // a valid key or session (e.g. the UI's offline "staff operator" session,
  // src/lib/auth.tsx) must not make a loopback caller worse off than no token.
  if (auth.localDev && isLoopback(remoteAddress)) return { kind: 'local-dev' };

  throw new ProxyError(401, 'Sign in required');
}

/**
 * Blocks cross-site requests from browsers. A page on another site can send a
 * "simple" text/plain POST to localhost without a CORS preflight, so we also
 * require a JSON body and an allowed (or absent) Origin.
 */
export function assertBrowserSafe(auth, headers, ownOrigins = []) {
  const origin = headers.origin;
  if (origin && !ownOrigins.includes(origin) && !auth.allowedOrigins.includes(origin)) {
    throw new ProxyError(403, 'Origin not allowed');
  }
  const type = String(headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new ProxyError(415, 'Content-Type must be application/json');
}

/** Origins the dev gateway itself is served from, taken from the Host header. */
export function ownOrigins(headers) {
  const host = headers.host;
  return host ? [`http://${host}`, `https://${host}`] : [];
}

/**
 * Guard for state-changing or token-using routes on the Vite dev gateway,
 * which `npm run dev` binds to 0.0.0.0: loopback callers only, then
 * assertBrowserSafe (allowed Origin + JSON body), then authenticate.
 * Throws ProxyError (403 / 415 / 401).
 */
export async function guardGatewayRequest(auth, req, fetchImpl = fetch) {
  const remote = req.socket?.remoteAddress;
  if (!isLoopback(remote)) throw new ProxyError(403, 'This route is only available from this machine');
  assertBrowserSafe(auth, req.headers, ownOrigins(req.headers));
  return authenticate(auth, req.headers, remote, fetchImpl);
}

/** CORS: only listed origins get the allow header; others are refused. */
export function corsHeaders(auth, origin) {
  if (!origin) return {};
  if (!auth.allowedOrigins.includes(origin)) throw new ProxyError(403, 'Origin not allowed');
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function findProject(projects, projectId) {
  if (!projectId) return null;
  const p = projects.get(projectId);
  if (!p) throw new ProxyError(403, `Unknown project "${projectId}"`);
  return p;
}

/**
 * Validates a GitHub proxy request and returns what to send upstream.
 * The repo in the path decides which project's token is used; if the caller
 * also names a project, it has to match.
 */
export function prepareGitHubRequest(projects, { endpoint, options, project_id }) {
  if (typeof endpoint !== 'string' || !endpoint) throw new ProxyError(400, 'Missing endpoint');
  const method = String(options?.method || 'GET').toUpperCase();

  let parsed;
  try {
    parsed = new URL(endpoint.startsWith('/') ? endpoint : `/${endpoint}`, 'https://api.github.com');
  } catch {
    throw new ProxyError(400, 'Invalid endpoint');
  }
  if (parsed.origin !== 'https://api.github.com') throw new ProxyError(400, 'Invalid endpoint');
  const path = parsed.pathname;
  if (path.includes('..') || path.includes('//')) throw new ProxyError(400, 'Invalid endpoint');

  const rule = GITHUB_ALLOWLIST.find((r) => r.method === method && r.path.test(path));
  if (!rule) throw new ProxyError(403, `${method} ${path} is not allowed`);
  for (const key of parsed.searchParams.keys()) {
    if (!ALLOWED_QUERY.has(key)) throw new ProxyError(403, `Query parameter "${key}" is not allowed`);
  }

  const [, owner, repo] = rule.path.exec(path);
  const slug = `${owner}/${repo}`.toLowerCase();
  const owning = [...projects.values()].find((p) => p.repos.has(slug));
  if (!owning) throw new ProxyError(403, `Repo ${slug} is not assigned to any project`);
  const named = findProject(projects, project_id);
  if (named && named.id !== owning.id) throw new ProxyError(403, `Repo ${slug} does not belong to ${named.id}`);

  let body;
  if (options?.body !== undefined && method !== 'GET') {
    const value = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    if (method === 'PATCH' && value && value.force) throw new ProxyError(403, 'Force-updating a branch is not allowed');
    body = JSON.stringify(value);
  }

  const headers = { 'User-Agent': 'AetherOrch-Proxy/1.0', Accept: 'application/vnd.github+json' };
  for (const [k, v] of Object.entries(options?.headers || {})) {
    if (FORWARDED_HEADERS.has(k.toLowerCase())) headers[k] = String(v);
  }
  headers.Authorization = `Bearer ${owning.githubToken}`;
  if (body) headers['Content-Type'] = 'application/json';

  return { url: `https://api.github.com${path}${parsed.search}`, method, headers, body, projectId: owning.id };
}

function listEnv(value, fallback) {
  const items = (value || '').split(',').map((s) => s.trim()).filter(Boolean);
  return items.length ? items : fallback;
}

// Override with PROXY_ANTHROPIC_MODELS / PROXY_OPENAI_MODELS (comma-separated).
export const AI_MODELS = {
  anthropic: listEnv(process.env.PROXY_ANTHROPIC_MODELS, ['claude-3-7-sonnet-20250219']),
  openai: listEnv(process.env.PROXY_OPENAI_MODELS, ['gpt-4o', 'gpt-4o-mini']),
};
const ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGES = 100;
const MAX_CHARS = 100_000;

/** Validates an AI chat request and returns the provider, model, key and messages. */
export function prepareAiRequest(projects, { messages, project_id, modelId }) {
  const project = findProject(projects, project_id);
  if (!project) throw new ProxyError(400, 'project_id is required');
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new ProxyError(400, 'messages must be a non-empty array');
  }
  let total = 0;
  const clean = messages.map((m) => {
    if (!m || !ROLES.has(m.role) || typeof m.content !== 'string') throw new ProxyError(400, 'Invalid message');
    total += m.content.length;
    return { role: m.role, content: m.content };
  });
  if (total > MAX_CHARS) throw new ProxyError(413, 'Conversation too long');

  const model = modelId || AI_MODELS.openai[0];
  const provider = AI_MODELS.anthropic.includes(model) ? 'anthropic' : AI_MODELS.openai.includes(model) ? 'openai' : null;
  if (!provider) throw new ProxyError(400, `Model "${model}" is not allowed`);
  const apiKey = provider === 'anthropic' ? project.anthropicApiKey : project.openaiApiKey;
  if (!apiKey) throw new ProxyError(403, `${project.id} has no ${provider} key configured`);
  return { provider, model, apiKey, messages: clean, projectId: project.id };
}

// --- Learning vault (dev gateway /api/learning/record) ---------------------
// Records end up in /api/learning/export, whose markdown format presents them
// as rules that "must govern" the AI, so writes are guarded and bounded.

export const LEARNING_DEFAULTS = { maxRecords: 500, maxFieldBytes: 4096, maxTags: 32 };
const LEARNING_TEXT_FIELDS = [
  'projectId',
  'projectName',
  'category',
  'title',
  'symptomAndIssue',
  'rootCause',
  'verifiedFix',
  'invariantRule',
  'modelUsed',
];

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** LEARNING_MAX_RECORDS (default 500) and LEARNING_MAX_FIELD_BYTES (default 4096). */
export function loadLearningLimits(env = process.env) {
  return {
    maxRecords: positiveInt(env.LEARNING_MAX_RECORDS, LEARNING_DEFAULTS.maxRecords),
    maxFieldBytes: positiveInt(env.LEARNING_MAX_FIELD_BYTES, LEARNING_DEFAULTS.maxFieldBytes),
    maxTags: LEARNING_DEFAULTS.maxTags,
  };
}

/**
 * Validates a learning record payload. Wrong types get 400; a text field or
 * tag over maxFieldBytes (UTF-8) or more than maxTags tags gets 413.
 * Returns only the known fields; missing ones are left to the caller's defaults.
 * @returns {Record<string, any>}
 */
export function validateLearningPayload(payload, limits = LEARNING_DEFAULTS) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ProxyError(400, 'Learning record must be a JSON object');
  }
  const tooBig = (s) => Buffer.byteLength(s, 'utf8') > limits.maxFieldBytes;
  /** @type {Record<string, any>} */
  const clean = {};
  for (const field of LEARNING_TEXT_FIELDS) {
    const v = payload[field];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string') throw new ProxyError(400, `${field} must be a string`);
    if (tooBig(v)) throw new ProxyError(413, `${field} is larger than ${limits.maxFieldBytes} bytes`);
    clean[field] = v;
  }
  for (const field of ['tokensUsed', 'costUsd']) {
    const v = payload[field];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ProxyError(400, `${field} must be a non-negative number`);
    clean[field] = v;
  }
  if (payload.tags !== undefined && payload.tags !== null) {
    if (!Array.isArray(payload.tags) || payload.tags.some((t) => typeof t !== 'string')) {
      throw new ProxyError(400, 'tags must be an array of strings');
    }
    if (payload.tags.length > limits.maxTags) throw new ProxyError(413, `At most ${limits.maxTags} tags are allowed`);
    if (payload.tags.some(tooBig)) throw new ProxyError(413, `A tag is larger than ${limits.maxFieldBytes} bytes`);
    clean.tags = [...payload.tags];
  }
  return clean;
}

/**
 * Adds a record newest-first and drops the oldest ones beyond maxRecords
 * (seeded records included), so the store never grows without bound and
 * recording never gets stuck at the cap. Mutates and returns `records`.
 */
export function addLearningRecord(records, record, maxRecords = LEARNING_DEFAULTS.maxRecords) {
  records.unshift(record);
  if (records.length > maxRecords) records.length = maxRecords;
  return records;
}
