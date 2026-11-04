import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ProxyError,
  assertBrowserSafe,
  authenticate,
  forgetSession,
  signOutSession,
  tokenExpiryMs,
  isLoopback,
  addLearningRecord,
  assertLocalHost,
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
  PROXY_PROJECTS: 'proj-ehi-001,proj-iya-002',
  PROJ_EHI_001_GITHUB_TOKEN: 'ehi-token',
  PROJ_EHI_001_GITHUB_REPOS: 'geosan11/EHI-MULTISYSTEMS',
  PROJ_EHI_001_OPENAI_API_KEY: 'ehi-openai',
  PROJ_IYA_002_GITHUB_TOKEN: 'iya-token',
  PROJ_IYA_002_GITHUB_REPOS: 'acme/iya-oil',
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
  const { errors } = loadProjectCredentials({ ...env, PROJ_IYA_002_GITHUB_REPOS: 'geosan11/ehi-multisystems' });
  assert.ok(errors.some((e) => e.includes('assigned to both')));
});

test('uses the token of the project that owns the repo', () => {
  const r = prepareGitHubRequest(projects, { endpoint: '/repos/acme/iya-oil' });
  assert.equal(r.headers.Authorization, 'Bearer iya-token');
  assert.equal(r.projectId, 'proj-iya-002');
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
  assert.equal(status(() => prepareAiRequest(projects, { messages: msgs, project_id: 'proj-iya-002' })), 403);
  assert.equal(status(() => prepareAiRequest(projects, { messages: msgs, project_id: 'proj-ehi-001', modelId: 'claude-3-7-sonnet-20250219' })), 403);
  assert.equal(status(() => prepareAiRequest(projects, { messages: msgs, project_id: 'proj-ehi-001', modelId: 'o1-pro' })), 400);
  assert.equal(status(() => prepareAiRequest(projects, { messages: [{ role: 'tool', content: 'x' }], project_id: 'proj-ehi-001' })), 400);
});

const testJwt = (expInSeconds, tag = Math.random().toString(36).slice(2)) =>
  `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + expInSeconds, tag })).toString('base64url')}.sig`;

test('auth: api key, supabase session, local-dev loopback only', async () => {
  const apiAuth = loadAuthConfig({ PROXY_API_KEY: 'k3y' });
  assert.equal((await authenticate(apiAuth, { authorization: 'Bearer k3y' }, '1.2.3.4')).kind, 'api-key');
  await assert.rejects(authenticate(apiAuth, { authorization: 'Bearer nope' }, '1.2.3.4'), { status: 401 });
  await assert.rejects(authenticate(apiAuth, {}, '127.0.0.1'), { status: 401 });

  const sbAuth = loadAuthConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', OWNER_USER_ID: 'u1' });
  const good = testJwt(3600);
  const fakeFetch = async (url, init) => ({
    ok: init.headers.Authorization === `Bearer ${good}`,
    status: init.headers.Authorization === `Bearer ${good}` ? 200 : 401,
    json: async () => ({ id: 'u1', email: 'a@b.c' }),
  });
  assert.equal((await authenticate(sbAuth, { authorization: `Bearer ${good}` }, '1.2.3.4', fakeFetch)).id, 'u1');
  await assert.rejects(authenticate(sbAuth, { authorization: 'Bearer bad' }, '1.2.3.4', fakeFetch), { status: 401 });
  // A valid session from any other account is refused, cached or not.
  const otherAuth = loadAuthConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', OWNER_USER_ID: 'owner' });
  await assert.rejects(authenticate(otherAuth, { authorization: `Bearer ${good}` }, '1.2.3.4', fakeFetch), { status: 403 });
  assert.ok(loadAuthConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }).errors.length > 0);

  const devAuth = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev' });
  assert.equal((await authenticate(devAuth, {}, '127.0.0.1')).kind, 'local-dev');
  await assert.rejects(authenticate(devAuth, {}, '10.0.0.5'), { status: 401 });
  // The UI's offline operator session sends a non-Supabase bearer token.
  assert.equal((await authenticate(devAuth, { authorization: 'Bearer ehi-operator-123' }, '127.0.0.1')).kind, 'local-dev');
  await assert.rejects(authenticate(devAuth, { authorization: 'Bearer ehi-operator-123' }, '10.0.0.5'), { status: 401 });
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

test('local-dev: forwarded loopback requests get no loopback trust', async () => {
  const devAuth = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev' });
  await assert.rejects(authenticate(devAuth, { 'x-forwarded-for': '203.0.113.5' }, '127.0.0.1'), { status: 401 });
  for (const h of ['forwarded', 'x-forwarded-host', 'x-real-ip']) {
    await assert.rejects(authenticate(devAuth, { [h]: 'x' }, '::1'), { status: 401 });
  }
  const keyAuth = loadAuthConfig({ PROXY_AUTH_MODE: 'local-dev', PROXY_API_KEY: 'k3y' });
  assert.equal((await authenticate(keyAuth, { 'x-forwarded-for': '203.0.113.5', authorization: 'Bearer k3y' }, '127.0.0.1')).kind, 'api-key');
  // The dev gateway refuses relayed requests outright.
  const req = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:3000', 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' } };
  await assert.rejects(guardGatewayRequest(devAuth, req), { status: 403, message: /tunnel or proxy.*npm run proxy/ });
  await assert.rejects(
    guardGatewayRequest(devAuth, { socket: { remoteAddress: '10.0.0.5' }, headers: { host: '127.0.0.1:3000', 'content-type': 'application/json' } }),
    { status: 403, message: 'This route is only available from this machine' }
  );
});

test('assertLocalHost only accepts this machine', () => {
  assert.throws(() => assertLocalHost({ host: 'evil.example:3001' }), { status: 403 });
  assert.throws(() => assertLocalHost({ host: 'localhost.evil.example' }), { status: 403 });
  assert.throws(() => assertLocalHost({}), { status: 403 });
  for (const host of ['localhost:3001', '127.0.0.1:3001', '[::1]:3001', 'LOCALHOST', '127.0.0.1']) {
    assert.doesNotThrow(() => assertLocalHost({ host }), host);
  }
  assert.doesNotThrow(() => assertLocalHost({ host: 'proxy.example.com:443' }, ['proxy.example.com']));
  // Junk after an IPv6 literal, a bare port, or extra colons never parse as a host.
  for (const host of ['[::1]evil', '[::1]evil:3001', '[::1]:3001x', ':3001', 'localhost:3001:1', '[::1']) {
    assert.throws(() => assertLocalHost({ host }), { status: 403 }, host);
  }
});

test('assertLocalHost: a trailing comma in PROXY_ALLOWED_HOSTS does not admit an empty Host', () => {
  const saved = process.env.PROXY_ALLOWED_HOSTS;
  process.env.PROXY_ALLOWED_HOSTS = 'localhost,';
  try {
    assert.throws(() => assertLocalHost({ host: '' }), { status: 403 });
    assert.throws(() => assertLocalHost({}), { status: 403 });
    assert.doesNotThrow(() => assertLocalHost({ host: 'localhost' }));
    assert.throws(() => assertLocalHost({ host: '127.0.0.1:3001' }), { status: 403 });
  } finally {
    if (saved === undefined) delete process.env.PROXY_ALLOWED_HOSTS;
    else process.env.PROXY_ALLOWED_HOSTS = saved;
  }
  for (const host of ['[::1]:3001', 'localhost', '127.0.0.1:3001']) {
    assert.doesNotThrow(() => assertLocalHost({ host }), host);
  }
});

test('session cache: min(10 s, token exp), dropped when Supabase answers 401', async (t) => {
  const auth = loadAuthConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', OWNER_USER_ID: 'u1' });
  let upstream = 200;
  let calls = 0;
  const fetchUser = async () => {
    calls++;
    return { ok: upstream === 200, status: upstream, json: async () => ({ id: 'u1', email: 'a@b.c' }) };
  };
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });

  // Token expires in 5 s: cached for 5 s, not 10 s.
  const short = testJwt(5);
  await authenticate(auth, { authorization: `Bearer ${short}` }, '1.2.3.4', fetchUser);
  await authenticate(auth, { authorization: `Bearer ${short}` }, '1.2.3.4', fetchUser);
  assert.equal(calls, 1, 'second call served from the cache');
  t.mock.timers.tick(5_001);
  upstream = 401; // Supabase now rejects the expired token
  await assert.rejects(authenticate(auth, { authorization: `Bearer ${short}` }, '1.2.3.4', fetchUser), { status: 401 });
  assert.equal(calls, 2, 'expired token re-checked upstream, not served from the cache');

  // A long-lived token is still cached for at most 10 s.
  upstream = 200;
  const long = testJwt(3600);
  await authenticate(auth, { authorization: `Bearer ${long}` }, '1.2.3.4', fetchUser);
  t.mock.timers.tick(9_000);
  await authenticate(auth, { authorization: `Bearer ${long}` }, '1.2.3.4', fetchUser);
  assert.equal(calls, 3);
  t.mock.timers.tick(1_001);
  upstream = 401; // signed out: the cache entry has lapsed and the 401 drops it
  await assert.rejects(authenticate(auth, { authorization: `Bearer ${long}` }, '1.2.3.4', fetchUser), { status: 401 });
  upstream = 200;
  await authenticate(auth, { authorization: `Bearer ${long}` }, '1.2.3.4', fetchUser);
  assert.equal(calls, 5, 'nothing cached after the 401');

  // A token without exp is never cached.
  const noExp = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from('{"sub":"u1"}').toString('base64url')}.sig`;
  await authenticate(auth, { authorization: `Bearer ${noExp}` }, '1.2.3.4', fetchUser);
  await authenticate(auth, { authorization: `Bearer ${noExp}` }, '1.2.3.4', fetchUser);
  assert.equal(calls, 7);

  // forgetSession drops a live entry at once.
  await authenticate(auth, { authorization: `Bearer ${long}` }, '1.2.3.4', fetchUser);
  forgetSession(long);
  await authenticate(auth, { authorization: `Bearer ${long}` }, '1.2.3.4', fetchUser);
  assert.equal(calls, 8);
  assert.equal(tokenExpiryMs('not-a-jwt'), null);
});

test('signOutSession (POST /api/auth/signout) drops the caller token from the cache at once', async () => {
  const auth = loadAuthConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', OWNER_USER_ID: 'u1' });
  let calls = 0;
  const fetchUser = async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'a@b.c' }) };
  };
  const token = testJwt(3600);
  const headers = { authorization: `Bearer ${token}` };
  await authenticate(auth, headers, '1.2.3.4', fetchUser);
  await authenticate(auth, headers, '1.2.3.4', fetchUser);
  assert.equal(calls, 1, 'cached');
  signOutSession(headers);
  await authenticate(auth, headers, '1.2.3.4', fetchUser);
  assert.equal(calls, 2, 're-checked with Supabase after sign-out');
  signOutSession({}); // no token: nothing to do, no throw
});
