import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ProxyError,
  assertBrowserSafe,
  authenticate,
  isLoopback,
  addLearningRecord,
  corsHeaders,
  guardGatewayRequest,
  loadLearningLimits,
  validateLearningPayload,
  loadAuthConfig,
  loadProjectCredentials,
  prepareAiRequest,
  prepareGitHubRequest,
} from './proxySecurity.js';

const SHA = 'a'.repeat(40);
const env = {
  PROXY_PROJECTS: 'proj-ehi-001,proj-iya-001',
  PROJ_EHI_001_GITHUB_TOKEN: 'ehi-token',
  PROJ_EHI_001_GITHUB_REPOS: 'geosan11/EHI-MULTISYSTEMS',
  PROJ_EHI_001_OPENAI_API_KEY: 'ehi-openai',
  PROJ_IYA_001_GITHUB_TOKEN: 'iya-token',
  PROJ_IYA_001_GITHUB_REPOS: 'acme/iya-oil',
};
const { projects } = loadProjectCredentials(env);
const status = (fn) => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof ProxyError, e);
    return e.status;
  }
  return 200;
};

test('startup config fails when keys are missing', () => {
  assert.ok(loadProjectCredentials({}).errors.length > 0);
  const { errors } = loadProjectCredentials({ PROXY_PROJECTS: 'proj-x-1', PROJ_X_1_GITHUB_REPOS: 'a/b' });
  assert.deepEqual(errors, ['PROJ_X_1_GITHUB_TOKEN is missing.']);
  assert.ok(loadAuthConfig({}).errors.length > 0);
  assert.equal(loadProjectCredentials(env).errors.length, 0);
});

test('a repo cannot belong to two projects', () => {
  const { errors } = loadProjectCredentials({ ...env, PROJ_IYA_001_GITHUB_REPOS: 'geosan11/ehi-multisystems' });
  assert.ok(errors.some((e) => e.includes('assigned to both')));
});

test('uses the token of the project that owns the repo', () => {
  const r = prepareGitHubRequest(projects, { endpoint: '/repos/acme/iya-oil' });
  assert.equal(r.headers.Authorization, 'Bearer iya-token');
  assert.equal(r.projectId, 'proj-iya-001');
});

test('unknown repo or mismatched project is refused, never falls back', () => {
  assert.equal(status(() => prepareGitHubRequest(projects, { endpoint: '/repos/evil/repo' })), 403);
  assert.equal(status(() => prepareGitHubRequest(projects, { endpoint: '/repos/acme/iya-oil', project_id: 'proj-ehi-001' })), 403);
  assert.equal(status(() => prepareGitHubRequest(projects, { endpoint: '/repos/acme/iya-oil', project_id: 'proj-nope' })), 403);
});

test('only allowlisted endpoints and methods pass', () => {
  const ok = (endpoint, method, body) =>
    status(() => prepareGitHubRequest(projects, { endpoint, options: { method, body } }));
  assert.equal(ok('/repos/acme/iya-oil/commits?sha=main&per_page=1', 'GET'), 200);
  assert.equal(ok(`/repos/acme/iya-oil/git/trees/${SHA}?recursive=1`, 'GET'), 200);
  assert.equal(ok('/repos/acme/iya-oil/git/blobs', 'POST', { content: 'x' }), 200);
  assert.equal(ok('/repos/acme/iya-oil/git/refs/heads/main', 'PATCH', { sha: SHA }), 200);
  assert.equal(ok('/repos/acme/iya-oil', 'DELETE'), 403);
  assert.equal(ok('/user/repos', 'POST'), 403);
  assert.equal(ok('/repos/acme/iya-oil/collaborators/bob', 'PUT'), 403);
  assert.equal(ok('/repos/acme/iya-oil/git/refs/heads/main', 'PATCH', { sha: SHA, force: true }), 403);
  assert.equal(ok('/repos/acme/iya-oil/commits?access_token=x', 'GET'), 403);
  assert.equal(ok('/repos/acme/iya-oil/../../user', 'GET'), 403);
  assert.equal(ok('//evil.example.com/repos/acme/iya-oil', 'GET'), 400);
});

test('client cannot override Authorization', () => {
  const r = prepareGitHubRequest(projects, {
    endpoint: '/repos/acme/iya-oil',
    options: { headers: { Authorization: 'token stolen', 'X-GitHub-Api-Version': '2022-11-28' } },
  });
  assert.equal(r.headers.Authorization, 'Bearer iya-token');
  assert.equal(r.headers['X-GitHub-Api-Version'], '2022-11-28');
});

test('AI chat needs a known project with its own provider key', () => {
  const msgs = [{ role: 'user', content: 'hi' }];
  assert.equal(prepareAiRequest(projects, { messages: msgs, project_id: 'proj-ehi-001' }).apiKey, 'ehi-openai');
  assert.equal(status(() => prepareAiRequest(projects, { messages: msgs })), 400);
  assert.equal(status(() => prepareAiRequest(projects, { messages: msgs, project_id: 'proj-iya-001' })), 403);
  assert.equal(status(() => prepareAiRequest(projects, { messages: msgs, project_id: 'proj-ehi-001', modelId: 'claude-3-7-sonnet-20250219' })), 403);
  assert.equal(status(() => prepareAiRequest(projects, { messages: msgs, project_id: 'proj-ehi-001', modelId: 'o1-pro' })), 400);
  assert.equal(status(() => prepareAiRequest(projects, { messages: [{ role: 'tool', content: 'x' }], project_id: 'proj-ehi-001' })), 400);
});

test('auth: api key, supabase session, local-dev loopback only', async () => {
  const apiAuth = loadAuthConfig({ PROXY_API_KEY: 'k3y' });
  assert.equal((await authenticate(apiAuth, { authorization: 'Bearer k3y' }, '1.2.3.4')).kind, 'api-key');
  await assert.rejects(authenticate(apiAuth, { authorization: 'Bearer nope' }, '1.2.3.4'), { status: 401 });
  await assert.rejects(authenticate(apiAuth, {}, '127.0.0.1'), { status: 401 });

  const sbAuth = loadAuthConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' });
  const fakeFetch = async (url, init) => ({
    ok: init.headers.Authorization === 'Bearer good',
    json: async () => ({ id: 'u1', email: 'a@b.c' }),
  });
  assert.equal((await authenticate(sbAuth, { authorization: 'Bearer good' }, '1.2.3.4', fakeFetch)).id, 'u1');
  await assert.rejects(authenticate(sbAuth, { authorization: 'Bearer bad' }, '1.2.3.4', fakeFetch), { status: 401 });

  const devAuth = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev' });
  assert.equal((await authenticate(devAuth, {}, '127.0.0.1')).kind, 'local-dev');
  await assert.rejects(authenticate(devAuth, {}, '10.0.0.5'), { status: 401 });
});

test('CORS only for listed origins', () => {
  const auth = loadAuthConfig({ PROXY_API_KEY: 'k', PROXY_ALLOWED_ORIGINS: 'http://localhost:3000' });
  assert.equal(corsHeaders(auth, 'http://localhost:3000')['Access-Control-Allow-Origin'], 'http://localhost:3000');
  assert.throws(() => corsHeaders(auth, 'https://evil.example.com'), { status: 403 });
  assert.deepEqual(corsHeaders(auth, undefined), {});
});

test('cross-site simple requests are refused', () => {
  const auth = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev' });
  const json = { 'content-type': 'application/json' };
  assert.doesNotThrow(() => assertBrowserSafe(auth, json));
  assert.doesNotThrow(() => assertBrowserSafe(auth, { ...json, origin: 'http://localhost:3000' }, ['http://localhost:3000']));
  assert.throws(() => assertBrowserSafe(auth, { ...json, origin: 'https://evil.example.com' }), { status: 403 });
  assert.throws(() => assertBrowserSafe(auth, { 'content-type': 'text/plain' }), { status: 415 });
  assert.throws(() => assertBrowserSafe(auth, {}), { status: 415 });
});

test('loopback detection', () => {
  assert.ok(isLoopback('127.0.0.1') && isLoopback('::1') && isLoopback('::ffff:127.0.0.1'));
  assert.ok(!isLoopback('192.168.1.20'));
});

test('allowed origins pass assertBrowserSafe, Origin: null is refused', () => {
  const json = { 'content-type': 'application/json' };
  const listed = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev', PROXY_ALLOWED_ORIGINS: 'https://app.example.com' });
  assert.doesNotThrow(() => assertBrowserSafe(listed, { ...json, origin: 'https://app.example.com' }));
  assert.throws(() => assertBrowserSafe(listed, { ...json, origin: 'http://localhost:3000' }), { status: 403 });

  const defaults = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev' });
  assert.deepEqual(defaults.allowedOrigins, ['http://localhost:3000', 'http://127.0.0.1:3000']);
  assert.doesNotThrow(() => assertBrowserSafe(defaults, { ...json, origin: 'http://localhost:3000' }));
  assert.doesNotThrow(() => assertBrowserSafe(defaults, { ...json, origin: 'http://127.0.0.1:3000' }));
  // Sandboxed iframes and file:// pages send the literal string "null".
  assert.throws(() => assertBrowserSafe(defaults, { ...json, origin: 'null' }), { status: 403 });
  assert.throws(() => assertBrowserSafe(defaults, { ...json, origin: 'null' }, ['http://localhost:3000']), { status: 403 });
});

test('gateway guard (git/sync, github proxy): loopback, then origin + JSON, then auth', async () => {
  const auth = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev' });
  const req = (remoteAddress, headers) => ({ socket: { remoteAddress }, headers: { host: '127.0.0.1:3000', ...headers } });
  const json = { 'content-type': 'application/json' };

  assert.equal((await guardGatewayRequest(auth, req('127.0.0.1', json))).kind, 'local-dev');
  assert.equal((await guardGatewayRequest(auth, req('::1', { ...json, origin: 'http://127.0.0.1:3000' }))).kind, 'local-dev');
  await assert.rejects(guardGatewayRequest(auth, req('192.168.1.20', json)), { status: 403 });
  await assert.rejects(guardGatewayRequest(auth, req('127.0.0.1', { 'content-type': 'text/plain', origin: 'https://evil.example.com' })), { status: 403 });
  await assert.rejects(guardGatewayRequest(auth, req('127.0.0.1', { 'content-type': 'text/plain' })), { status: 415 });

  const keyAuth = loadAuthConfig({ PROXY_API_KEY: 'k3y' });
  await assert.rejects(guardGatewayRequest(keyAuth, req('127.0.0.1', json)), { status: 401 });
  assert.equal((await guardGatewayRequest(keyAuth, req('127.0.0.1', { ...json, authorization: 'Bearer k3y' }))).kind, 'api-key');
});

test('learning/record guard: foreign origin 403, text/plain 415, LAN 403, local JSON ok, no token 401', async () => {
  // Same guard the gateway runs before accepting POST /api/learning/record.
  const auth = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev' });
  const req = (remoteAddress, headers) => ({ socket: { remoteAddress }, headers: { host: '127.0.0.1:3000', ...headers } });
  const json = { 'content-type': 'application/json' };
  await assert.rejects(guardGatewayRequest(auth, req('127.0.0.1', { 'content-type': 'text/plain', origin: 'https://evil.example.com' })), { status: 403 });
  await assert.rejects(guardGatewayRequest(auth, req('127.0.0.1', { ...json, origin: 'null' })), { status: 403 });
  await assert.rejects(guardGatewayRequest(auth, req('127.0.0.1', { 'content-type': 'text/plain' })), { status: 415 });
  await assert.rejects(guardGatewayRequest(auth, req('10.0.0.5', json)), { status: 403 });
  assert.equal((await guardGatewayRequest(auth, req('127.0.0.1', { ...json, origin: 'http://127.0.0.1:3000' }))).kind, 'local-dev');
  await assert.rejects(guardGatewayRequest(loadAuthConfig({ PROXY_API_KEY: 'k' }), req('127.0.0.1', json)), { status: 401 });
});

test('learning limits: env config, field size, tags, types', () => {
  assert.deepEqual(loadLearningLimits({}), { maxRecords: 500, maxFieldBytes: 4096, maxTags: 32 });
  assert.deepEqual(loadLearningLimits({ LEARNING_MAX_RECORDS: '10', LEARNING_MAX_FIELD_BYTES: '64' }), { maxRecords: 10, maxFieldBytes: 64, maxTags: 32 });
  assert.deepEqual(loadLearningLimits({ LEARNING_MAX_RECORDS: '-1', LEARNING_MAX_FIELD_BYTES: 'abc' }), loadLearningLimits({}));

  const limits = loadLearningLimits({ LEARNING_MAX_FIELD_BYTES: '16' });
  const v = (p) => status(() => validateLearningPayload(p, limits));
  assert.deepEqual(validateLearningPayload({ title: 'ok', tags: ['a'], tokensUsed: 5, extra: 'dropped' }, limits), { title: 'ok', tags: ['a'], tokensUsed: 5 });
  assert.equal(v({ title: 'x'.repeat(16) }), 200);
  assert.equal(v({ invariantRule: 'x'.repeat(17) }), 413);
  assert.equal(v({ title: 'é'.repeat(9) }), 413); // 18 UTF-8 bytes
  assert.equal(v({ tags: ['x'.repeat(17)] }), 413);
  assert.equal(v({ tags: Array(33).fill('t') }), 413);
  assert.equal(v({ title: { nested: true } }), 400);
  assert.equal(v({ tags: 'not-an-array' }), 400);
  assert.equal(v({ costUsd: 'free' }), 400);
  assert.equal(v([]), 400);
  assert.equal(v({}), 200);
  assert.equal(status(() => validateLearningPayload({ rootCause: 'x'.repeat(4096) })), 200);
  assert.equal(status(() => validateLearningPayload({ rootCause: 'x'.repeat(4097) })), 413);
});

test('learning store keeps at most maxRecords, dropping the oldest', () => {
  const records = [{ id: 'old-2' }, { id: 'old-1' }];
  addLearningRecord(records, { id: 'new-1' }, 3);
  assert.deepEqual(records.map((r) => r.id), ['new-1', 'old-2', 'old-1']);
  addLearningRecord(records, { id: 'new-2' }, 3);
  assert.deepEqual(records.map((r) => r.id), ['new-2', 'new-1', 'old-2']);
  for (let i = 0; i < 600; i++) addLearningRecord(records, { id: `n${i}` });
  assert.equal(records.length, 500);
  assert.equal(records[0].id, 'n599');
});
