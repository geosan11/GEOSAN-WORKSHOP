/**
 * Shared policy for the server-side GitHub proxy.
 *
 * Both proxies (server.js and the Vite dev gateway in server/telemetry-gateway.ts)
 * hold the GitHub token, so they must only forward the calls the app actually makes.
 * Anything else is refused before it reaches api.github.com.
 */

const SEGMENT = '[A-Za-z0-9_.-]+';
const REPO = `/repos/${SEGMENT}/${SEGMENT}`;

/** Method + path pairs the GitHubClient in src/lib/github.ts uses. */
const ALLOWED_ROUTES = [
  { method: 'GET', pattern: new RegExp(`^${REPO}(/.*)?$`) },
  { method: 'POST', pattern: new RegExp(`^${REPO}/git/(blobs|trees|commits)$`) },
  { method: 'PATCH', pattern: new RegExp(`^${REPO}/git/refs/heads/.+$`) },
  { method: 'POST', pattern: new RegExp(`^${REPO}/pulls$`) },
];

const FORWARDED_HEADERS = ['accept', 'x-github-api-version', 'content-type'];

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export function allowedOrigins(env = process.env) {
  const raw = env.ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ORIGINS;
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

/** True when the request comes from a page we serve, or has no Origin (same-origin / server-to-server). */
export function isOriginAllowed(origin, env = process.env) {
  if (!origin) return true;
  return allowedOrigins(env).includes(origin);
}

function repoAllowlist(env) {
  const raw = env.GITHUB_PROXY_REPOS;
  if (!raw) return null;
  return new Set(raw.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean));
}

/**
 * Validates a proxy request.
 * Returns { ok: true, url, method, headers, body } or { ok: false, status, error }.
 */
export function checkGitHubProxyRequest(endpoint, options = {}, env = process.env) {
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    return { ok: false, status: 400, error: 'Missing endpoint' };
  }
  if (!endpoint.startsWith('/') || endpoint.includes('..') || endpoint.includes('//') || endpoint.includes('\\') || endpoint.includes('@')) {
    return { ok: false, status: 400, error: 'Invalid endpoint' };
  }

  const method = String(options?.method || 'GET').toUpperCase();
  const path = endpoint.split('?')[0];

  const route = ALLOWED_ROUTES.find((r) => r.method === method && r.pattern.test(path));
  if (!route) {
    return { ok: false, status: 403, error: `GitHub call not allowed by proxy policy: ${method} ${path}` };
  }

  const repos = repoAllowlist(env);
  if (repos) {
    const [, , owner, repo] = path.split('/');
    if (!repos.has(`${owner}/${repo}`.toLowerCase())) {
      return { ok: false, status: 403, error: `Repository ${owner}/${repo} is not in GITHUB_PROXY_REPOS` };
    }
  }

  const token = env.GITHUB_TOKEN || env.GITHUB_PAT || '';
  if (!token) {
    return { ok: false, status: 503, error: 'GitHub is not configured on the server (set GITHUB_TOKEN)' };
  }

  const headers = { 'User-Agent': 'AetherOrch-Proxy/1.0', Accept: 'application/vnd.github.v3+json' };
  for (const [key, value] of Object.entries(options?.headers || {})) {
    if (FORWARDED_HEADERS.includes(key.toLowerCase())) headers[key] = String(value);
  }
  headers.Authorization = `token ${token}`;

  let body;
  if (options?.body !== undefined && options?.body !== null && method !== 'GET') {
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  return { ok: true, url: `https://api.github.com${endpoint}`, method, headers, body };
}
