// Run: npx tsx --test src/lib/signinLockdown.test.ts
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

type Call = { url: string; method: string; headers: Record<string, string>; body?: any };
let calls: Call[] = [];
let respond: (c: Call) => { status: number; body: any } = () => ({ status: 200, body: [] });
(globalThis as any).fetch = async (url: string, init: any = {}) => {
  const c: Call = { url, method: init.method || 'GET', headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined };
  calls.push(c);
  const r = respond(c);
  return new Response(JSON.stringify(r.body), { status: r.status });
};

const { ProductionSupabaseClient, SESSION_STORAGE_KEY } = await import('./supabase.ts');
const { signInWithPolicy, restoreSessionWithPolicy, OWNER_LOCK_MESSAGE, isStaffFallbackAllowed } = await import('./authPolicy.ts');

const ANON = 'anon-key';
const OWNER_ID = 'owner-uuid';
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = () => Math.floor(Date.now() / 1000);
const jwt = (expInSeconds: number, sub = OWNER_ID, tag = '') =>
  `${b64({ alg: 'HS256' })}.${b64({ sub, role: 'authenticated', exp: now() + expInSeconds, tag })}.sig`;
const save = (s: any) => store.set(SESSION_STORAGE_KEY, JSON.stringify(s));
const saved = () => JSON.parse(store.get(SESSION_STORAGE_KEY) || 'null');
const isTokenCall = (c: Call) => c.url.includes('/auth/v1/token');
const isRefresh = (c: Call) => c.url.includes('grant_type=refresh_token');
const restCalls = () => calls.filter((c) => c.url.includes('/rest/v1/'));
const newClient = () => new ProductionSupabaseClient('https://example.supabase.co', ANON);
const owner = { id: OWNER_ID, email: 'sanni@example.com' };
const tokenResponse = (expIn = 3600, user = owner, tag = 'new') => ({
  access_token: jwt(expIn, user.id, tag),
  refresh_token: `rt-${tag}`,
  expires_in: expIn,
  token_type: 'bearer',
  user,
});

beforeEach(() => {
  store.clear();
  calls = [];
  respond = () => ({ status: 200, body: [] });
});

// --- 1. Staff operator fallback -------------------------------------------
const failingClient = {
  auth: {
    signInWithPassword: async () => ({ data: null, error: new Error('Invalid login credentials') }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
  },
} as any;

test('fallback is refused when VITE_DEMO_MODE is not "true", even on localhost', async () => {
  for (const env of [{}, { VITE_DEMO_MODE: 'false' }, { VITE_DEMO_MODE: '1' }]) {
    const r = await signInWithPolicy('anyone@x.com', 'whatever', { client: failingClient, env, hostname: 'localhost' });
    assert.equal(r.session, null);
    assert.match(r.error!.message, /Sign-in failed/);
    assert.match(r.error!.message, /Invalid login credentials/);
  }
  assert.equal(saved(), null);
});

test('fallback is refused in demo mode when the page is not localhost', async () => {
  for (const hostname of ['geosan-workshop.vercel.app', 'localhost.evil.com', '192.168.1.5', '']) {
    const r = await signInWithPolicy('anyone@x.com', 'p', { client: failingClient, env: { VITE_DEMO_MODE: 'true' }, hostname });
    assert.equal(r.session, null, hostname);
    assert.ok(r.error, hostname);
  }
  // Also refused with no Supabase client at all.
  const r = await signInWithPolicy('anyone@x.com', 'p', { client: null, env: {}, hostname: 'localhost' });
  assert.equal(r.session, null);
  assert.ok(r.error);
});

test('fallback is allowed in demo mode on localhost, 127.0.0.1 and [::1]', async () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    store.clear();
    const r = await signInWithPolicy('op@x.com', 'p', { client: failingClient, env: { VITE_DEMO_MODE: 'true' }, hostname });
    assert.equal(r.error, null, hostname);
    assert.equal(r.session?.local_demo, true);
    assert.equal(saved().local_demo, true);
  }
  assert.equal(isStaffFallbackAllowed({ VITE_DEMO_MODE: 'true' }, 'LOCALHOST'), true);
});

test('a saved demo staff session is dropped on reload outside local demo mode', async () => {
  save({ user: { id: 'usr-operator-x', email: 'op@x.com', user_metadata: { org_id: 'o' } }, access_token: 'ehi-operator-1', local_demo: true });
  const kept = await restoreSessionWithPolicy({ client: failingClient, env: { VITE_DEMO_MODE: 'true' }, hostname: 'localhost' });
  assert.equal(kept.session?.local_demo, true);
  const dropped = await restoreSessionWithPolicy({ client: failingClient, env: { VITE_DEMO_MODE: 'true' }, hostname: 'app.vercel.app' });
  assert.equal(dropped.session, null);
  assert.equal(saved(), null);
});

// --- 2. Refresh ---------------------------------------------------------------
test('sign-in keeps the refresh token in the existing storage key', async () => {
  respond = (c) => (isTokenCall(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: [] });
  const c = newClient();
  const r = await signInWithPolicy('sanni@example.com', 'pw', { client: c, env: {}, hostname: 'app.vercel.app' });
  assert.equal(r.error, null);
  assert.equal(saved().refresh_token, 'rt-new');
  assert.equal(typeof saved().expires_at, 'number');
  assert.deepEqual([...store.keys()], [SESSION_STORAGE_KEY]);
});

test('a token near expiry is refreshed before the request is sent', async () => {
  const old = jwt(30, OWNER_ID, 'old'); // inside the 60 s margin
  save({ access_token: old, refresh_token: 'rt-old', user: owner });
  respond = (c) => (isRefresh(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: [] });
  await newClient().from('projects').select('*');
  assert.equal(calls.length, 2);
  assert.ok(isRefresh(calls[0]));
  assert.deepEqual(calls[0].body, { refresh_token: 'rt-old' });
  assert.equal(calls[0].headers.apikey, ANON);
  assert.equal(restCalls()[0].headers.Authorization, `Bearer ${saved().access_token}`);
  assert.notEqual(saved().access_token, old);
  assert.equal(saved().refresh_token, 'rt-new');
});

test('the refresh timer fires before expiry with no request in flight', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    respond = (c) => (isTokenCall(c) && !isRefresh(c) ? { status: 200, body: tokenResponse(120, owner, 'first') } : { status: 200, body: tokenResponse(3600, owner, 'second') });
    const c = newClient();
    const events: string[] = [];
    c.auth.onAuthStateChange((e) => events.push(e));
    await c.auth.signInWithPassword({ email: 'sanni@example.com', password: 'pw' });
    assert.equal(calls.filter(isRefresh).length, 0);
    mock.timers.tick(61_000); // expiry (120 s) minus the 60 s margin
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    assert.equal(calls.filter(isRefresh).length, 1);
    assert.equal(saved().refresh_token, 'rt-second');
    assert.deepEqual(events, ['SIGNED_IN', 'TOKEN_REFRESHED']);
  } finally {
    mock.timers.reset();
  }
});

test('a 401 triggers one refresh and the request is retried with the new token', async () => {
  const old = jwt(3600, OWNER_ID, 'old');
  save({ access_token: old, refresh_token: 'rt-old', user: owner });
  let restCount = 0;
  respond = (c) => {
    if (isRefresh(c)) return { status: 200, body: tokenResponse() };
    restCount++;
    return restCount === 1 ? { status: 401, body: { message: 'JWT expired' } } : { status: 200, body: [{ id: 1 }] };
  };
  const res = await newClient().from('projects').select('*');
  assert.deepEqual(res, { data: [{ id: 1 }], error: null });
  assert.equal(calls.filter(isRefresh).length, 1);
  assert.equal(restCalls()[0].headers.Authorization, `Bearer ${old}`);
  assert.equal(restCalls()[1].headers.Authorization, `Bearer ${saved().access_token}`);
  assert.notEqual(saved().access_token, old);
});

test('parallel requests share one refresh', async () => {
  save({ access_token: jwt(10, OWNER_ID, 'old'), refresh_token: 'rt-old', user: owner });
  respond = (c) => (isRefresh(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: [] });
  const c = newClient();
  await Promise.all([c.from('a').select(), c.from('b').select(), c.from('c').select()]);
  assert.equal(calls.filter(isRefresh).length, 1);
});

// --- 3. Expired tokens are never sent --------------------------------------
test('an expired token without a refresh token is not sent; we fall back to signed out', async () => {
  const expired = jwt(-10);
  save({ access_token: expired, user: owner });
  const c = newClient();
  const events: string[] = [];
  c.auth.onAuthStateChange((e) => events.push(e));
  await c.from('projects').select('*');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, `Bearer ${ANON}`);
  assert.equal(saved(), null);
  assert.deepEqual(events, ['SIGNED_OUT']);
});

test('an expired token is never sent, whatever the refresh outcome', async () => {
  for (const refreshStatus of [200, 400, 500]) {
    store.clear();
    calls = [];
    const expired = jwt(-3600, OWNER_ID, 'expired');
    save({ access_token: expired, refresh_token: 'rt-old', user: owner });
    respond = (c) => (isRefresh(c) ? { status: refreshStatus, body: refreshStatus === 200 ? tokenResponse() : { error: 'invalid_grant' } } : { status: 200, body: [] });
    const c = newClient();
    await c.from('projects').select('*');
    await c.auth.getSession();
    for (const call of calls) assert.notEqual(call.headers.Authorization, `Bearer ${expired}`, `refresh ${refreshStatus}`);
  }
});

test('a JWT with no exp claim is treated as expired', async () => {
  save({ access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: OWNER_ID })}.sig` });
  await newClient().from('projects').select('*');
  assert.equal(calls[0].headers.Authorization, `Bearer ${ANON}`);
});

// --- 4. Failed refresh signs out --------------------------------------------
test('a rejected refresh signs out cleanly', async () => {
  save({ access_token: jwt(20), refresh_token: 'rt-revoked', user: owner });
  respond = (c) => (isRefresh(c) ? { status: 400, body: { error: 'invalid_grant', error_description: 'Invalid Refresh Token' } } : { status: 200, body: [] });
  const c = newClient();
  const events: [string, any][] = [];
  c.auth.onAuthStateChange((e, s) => events.push([e, s]));
  const r = await c.auth.refreshSession();
  assert.ok(r.error);
  assert.equal(r.data.session, null);
  assert.equal(saved(), null);
  assert.deepEqual(events, [['SIGNED_OUT', null]]);
  assert.deepEqual((await c.auth.getSession()).data.session, null);
});

test('a refresh that fails after a 401 signs out and returns the 401', async () => {
  save({ access_token: jwt(3600), refresh_token: 'rt-revoked', user: owner });
  respond = (c) => (isRefresh(c) ? { status: 400, body: { error: 'invalid_grant' } } : { status: 401, body: { message: 'JWT expired' } });
  const res = await newClient().from('projects').select('*');
  assert.equal(res.data, null);
  assert.match(res.error!.message, /JWT expired/);
  assert.equal(restCalls().length, 1);
  assert.equal(saved(), null);
});

test('restoring an expired session whose refresh fails ends signed out', async () => {
  save({ access_token: jwt(-5), refresh_token: 'rt-revoked', user: owner });
  respond = () => ({ status: 400, body: { error: 'invalid_grant' } });
  const r = await restoreSessionWithPolicy({ client: newClient(), env: {}, hostname: 'app.vercel.app' });
  assert.equal(r.session, null);
  assert.equal(saved(), null);
});

// --- 5. Owner check ----------------------------------------------------------
test('a non-owner is signed out after sign-in (VITE_OWNER_USER_ID)', async () => {
  const stranger = { id: 'stranger-uuid', email: 'stranger@example.com' };
  respond = (c) => (isTokenCall(c) ? { status: 200, body: tokenResponse(3600, stranger) } : { status: 200, body: {} });
  const r = await signInWithPolicy('stranger@example.com', 'pw', { client: newClient(), env: { VITE_OWNER_USER_ID: OWNER_ID }, hostname: 'app.vercel.app' });
  assert.equal(r.session, null);
  assert.equal(r.error!.message, OWNER_LOCK_MESSAGE);
  assert.equal(saved(), null);
  assert.ok(calls.some((c) => c.url.endsWith('/auth/v1/logout')), 'refresh token revoked');
});

test('a non-owner is signed out (VITE_OWNER_EMAILS), even in local demo mode', async () => {
  const stranger = { id: 'stranger-uuid', email: 'stranger@example.com' };
  respond = (c) => (isTokenCall(c) ? { status: 200, body: tokenResponse(3600, stranger) } : { status: 200, body: {} });
  const r = await signInWithPolicy('stranger@example.com', 'pw', {
    client: newClient(),
    env: { VITE_OWNER_EMAILS: 'Sanni@Example.com', VITE_DEMO_MODE: 'true' },
    hostname: 'localhost',
  });
  assert.equal(r.error!.message, OWNER_LOCK_MESSAGE);
  assert.equal(saved(), null);
});

test('the owner gets in by id or by email', async () => {
  respond = (c) => (isTokenCall(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: {} });
  for (const env of [{ VITE_OWNER_USER_ID: `other, ${OWNER_ID}` }, { VITE_OWNER_EMAILS: 'SANNI@example.com' }, {}]) {
    store.clear();
    const r = await signInWithPolicy('sanni@example.com', 'pw', { client: newClient(), env, hostname: 'app.vercel.app' });
    assert.equal(r.error, null, JSON.stringify(env));
    assert.equal(r.session?.user.id, OWNER_ID);
  }
});

test('a saved non-owner session is signed out on reload', async () => {
  save({ ...tokenResponse(3600, { id: 'stranger-uuid', email: 's@x' }) });
  const r = await restoreSessionWithPolicy({ client: newClient(), env: { VITE_OWNER_USER_ID: OWNER_ID }, hostname: 'app.vercel.app' });
  assert.equal(r.session, null);
  assert.equal(r.error!.message, OWNER_LOCK_MESSAGE);
  assert.equal(saved(), null);
});
