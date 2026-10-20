// Run: npx tsx --test src/lib/signinLockdown.test.ts
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

type Call = { url: string; method: string; headers: Record<string, string>; body?: any; signal?: AbortSignal };
let calls: Call[] = [];
type Reply = { status: number; body: any };
let respond: (c: Call) => Reply | Promise<Reply> = () => ({ status: 200, body: [] });
(globalThis as any).fetch = async (url: string, init: any = {}) => {
  const c: Call = { url, method: init.method || 'GET', headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined, signal: init.signal };
  calls.push(c);
  const r = await respond(c);
  return new Response(JSON.stringify(r.body), { status: r.status });
};

const { ProductionSupabaseClient, SESSION_STORAGE_KEY, isRefreshRejected } = await import('./supabase.ts');
const { signInWithPolicy, restoreSessionWithPolicy, readOwnerConfig, isOwner, OWNER_LOCK_MESSAGE, OWNER_NOT_CONFIGURED_MESSAGE, isStaffFallbackAllowed } = await import('./authPolicy.ts');

const ANON = 'anon-key';
const OWNER_ID = 'owner-uuid';
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = () => Math.floor(Date.now() / 1000);
const jwt = (expInSeconds: number, sub = OWNER_ID, tag = '') =>
  `${b64({ alg: 'HS256' })}.${b64({ sub, role: 'authenticated', exp: now() + expInSeconds, tag })}.sig`;
/** The access-token part of a stored session, with its expiry on the local clock. */
const live = (expInSeconds: number, sub = OWNER_ID, tag = '') => ({
  access_token: jwt(expInSeconds, sub, tag),
  expires_in: 3600,
  expiresAtLocal: Date.now() + expInSeconds * 1000,
});
const save = (s: any) => store.set(SESSION_STORAGE_KEY, JSON.stringify(s));
const saved = () => JSON.parse(store.get(SESSION_STORAGE_KEY) || 'null');
const isTokenCall = (c: Call) => c.url.includes('/auth/v1/token');
const isRefresh = (c: Call) => c.url.includes('grant_type=refresh_token');
const restCalls = () => calls.filter((c) => c.url.includes('/rest/v1/'));
const clients: any[] = [];
const newClient = (events: any = null, locks: any = null) => {
  const c = new ProductionSupabaseClient('https://example.supabase.co', ANON, { events, locks } as any);
  clients.push(c);
  return c;
};
const owner = { id: OWNER_ID, email: 'sanni@example.com' };
/** The owner is configured (sign-in fails closed without one). */
const OWNER_ENV = { VITE_OWNER_USER_ID: OWNER_ID };
const tokenResponse = (expIn = 3600, user = owner, tag = 'new') => ({
  access_token: jwt(expIn, user.id, tag),
  refresh_token: `rt-${tag}`,
  expires_in: expIn,
  token_type: 'bearer',
  user,
});

beforeEach(() => {
  for (const c of clients.splice(0)) c.dispose();
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
  const r = await signInWithPolicy('sanni@example.com', 'pw', { client: c, env: OWNER_ENV, hostname: 'app.vercel.app' });
  assert.equal(r.error, null);
  assert.equal(saved().refresh_token, 'rt-new');
  assert.equal(typeof saved().expiresAtLocal, 'number');
  assert.deepEqual([...store.keys()], [SESSION_STORAGE_KEY]);
});

test('a token near expiry is refreshed before the request is sent', async () => {
  const first = live(30, OWNER_ID, 'old'); // inside the 60 s margin
  const old = first.access_token;
  save({ ...first, refresh_token: 'rt-old', user: owner });
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
  const first = live(3600, OWNER_ID, 'old');
  const old = first.access_token;
  save({ ...first, refresh_token: 'rt-old', user: owner });
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
  save({ ...live(10, OWNER_ID, 'old'), refresh_token: 'rt-old', user: owner });
  respond = (c) => (isRefresh(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: [] });
  const c = newClient();
  await Promise.all([c.from('a').select(), c.from('b').select(), c.from('c').select()]);
  assert.equal(calls.filter(isRefresh).length, 1);
});

// --- 3. Expired tokens are never sent --------------------------------------
test('an expired token without a refresh token is not sent; we fall back to signed out', async () => {
  const gone = live(-10);
  const expired = gone.access_token;
  save({ ...gone, user: owner });
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
    const gone = live(-3600, OWNER_ID, 'expired');
    const expired = gone.access_token;
    save({ ...gone, refresh_token: 'rt-old', user: owner });
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
  save({ ...live(20), refresh_token: 'rt-revoked', user: owner });
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
  save({ ...live(3600), refresh_token: 'rt-revoked', user: owner });
  respond = (c) => (isRefresh(c) ? { status: 400, body: { error: 'invalid_grant' } } : { status: 401, body: { message: 'JWT expired' } });
  const res = await newClient().from('projects').select('*');
  assert.equal(res.data, null);
  assert.match(res.error!.message, /JWT expired/);
  assert.equal(restCalls().length, 1);
  assert.equal(saved(), null);
});

test('restoring an expired session whose refresh fails ends signed out', async () => {
  save({ ...live(-5), refresh_token: 'rt-revoked', user: owner });
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
  for (const env of [{ VITE_OWNER_USER_ID: `other, ${OWNER_ID}` }, { VITE_OWNER_EMAILS: 'SANNI@example.com' }]) {
    store.clear();
    const r = await signInWithPolicy('sanni@example.com', 'pw', { client: newClient(), env, hostname: 'app.vercel.app' });
    assert.equal(r.error, null, JSON.stringify(env));
    assert.equal(r.session?.user.id, OWNER_ID);
  }
});

test('a saved non-owner session is signed out on reload', async () => {
  save({ ...tokenResponse(3600, { id: 'stranger-uuid', email: 's@x' }), expiresAtLocal: Date.now() + 3600_000 });
  const r = await restoreSessionWithPolicy({ client: newClient(), env: { VITE_OWNER_USER_ID: OWNER_ID }, hostname: 'app.vercel.app' });
  assert.equal(r.session, null);
  assert.equal(r.error!.message, OWNER_LOCK_MESSAGE);
  assert.equal(saved(), null);
});

test('with VITE_OWNER_USER_ID set, a matching email alone does not get in', async () => {
  const sameEmail = { id: 'other-uuid', email: 'sanni@example.com' };
  respond = (c) => (isTokenCall(c) ? { status: 200, body: tokenResponse(3600, sameEmail) } : { status: 200, body: {} });
  const r = await signInWithPolicy('sanni@example.com', 'pw', {
    client: newClient(),
    env: { VITE_OWNER_USER_ID: OWNER_ID, VITE_OWNER_EMAILS: 'sanni@example.com' },
    hostname: 'app.vercel.app',
  });
  assert.equal(r.error!.message, OWNER_LOCK_MESSAGE);
});

test('owner config reads each VITE_ variable by name, never the whole import.meta.env', () => {
  for (const file of ['authPolicy.ts', 'supabase.ts']) {
    const code = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*\*)/.test(l))
      .join('\n');
    assert.doesNotMatch(code, /import\.meta[^.\n]{0,12}\.env(?!\??\.VITE_[A-Z0-9_]+)/, file);
  }
});

// --- 6. Device clock skew ---------------------------------------------------
// The device clock is off from Supabase's. The server's exp / expires_at are
// server time; only expires_in (measured on the device clock) may be used.
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};
const SERVER_START = 1_800_000_000_000;

for (const [label, skewMs] of [
  ['+5 min', 5 * 60_000],
  ['-5 min', -5 * 60_000],
  ['+2 h (longer than the token lifetime)', 2 * 3600_000],
] as const) {
  test(`device clock ${label}: no refresh loop, refresh 60 s before the real expiry`, async () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START + skewMs });
    try {
      const serverNowS = () => Math.floor((Date.now() - skewMs) / 1000);
      let n = 0;
      const serverToken = () => {
        const tag = `t${++n}`;
        const iat = serverNowS();
        return {
          access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: OWNER_ID, iat, exp: iat + 3600, tag })}.sig`,
          refresh_token: `rt-${tag}`,
          expires_in: 3600,
          expires_at: iat + 3600,
          token_type: 'bearer',
          user: owner,
        };
      };
      respond = (c) => (isTokenCall(c) ? { status: 200, body: serverToken() } : { status: 200, body: [] });
      const c = newClient();
      await c.auth.signInWithPassword({ email: 'sanni@example.com', password: 'pw' });
      const first = saved().access_token;
      for (let i = 0; i < 10; i++) await c.from('p').select();
      await flush();
      assert.equal(calls.filter(isRefresh).length, 0, 'no refresh right after sign-in');
      assert.ok(restCalls().every((x) => x.headers.Authorization === `Bearer ${first}`));

      mock.timers.tick(30_000);
      await flush();
      assert.equal(calls.filter(isRefresh).length, 0, 'timer did not refire');

      mock.timers.tick(3540_000 - 30_000 - 1_000); // 1 s before expiry - 60 s
      await c.from('p').select();
      await flush();
      assert.equal(calls.filter(isRefresh).length, 0, 'not refreshed early');

      mock.timers.tick(2_000);
      await flush();
      assert.equal(calls.filter(isRefresh).length, 1, 'refreshed by the timer on the local schedule');
      for (let i = 0; i < 10; i++) await c.from('p').select();
      mock.timers.tick(60_000);
      await flush();
      assert.equal(calls.filter(isRefresh).length, 1, 'exactly one refresh');
      assert.equal(restCalls().at(-1)!.headers.Authorization, `Bearer ${saved().access_token}`);
      assert.notEqual(saved().access_token, first);
    } finally {
      mock.timers.reset();
    }
  });
}

test('a legacy session without a local expiry is refreshed, not trusted by its JWT exp', async () => {
  save({ access_token: jwt(3600, OWNER_ID, 'legacy'), refresh_token: 'rt-legacy', expires_at: now() + 3600, user: owner });
  respond = (c) => (isRefresh(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: [] });
  await newClient().from('p').select();
  assert.equal(calls.filter(isRefresh).length, 1);
  assert.equal(typeof saved().expiresAtLocal, 'number');
});

// --- 7. Backoff -------------------------------------------------------------
test('a failing refresh (503) backs off: 5 s minimum, then doubling; the session is kept', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START });
  try {
    save({ ...live(30), refresh_token: 'rt-old', user: owner });
    const token = saved().access_token;
    let down = true;
    respond = (c) => (isRefresh(c) ? (down ? { status: 503, body: { message: 'unavailable' } } : { status: 200, body: tokenResponse() }) : { status: 200, body: [] });
    const c = newClient();
    const events: string[] = [];
    c.auth.onAuthStateChange((e) => events.push(e));
    const refreshes = () => calls.filter(isRefresh).length;

    await Promise.all(Array.from({ length: 5 }, () => c.from('p').select()));
    for (let i = 0; i < 5; i++) await c.from('p').select();
    assert.equal(refreshes(), 1, 'one refresh for ten requests');
    assert.ok(restCalls().every((x) => x.headers.Authorization === `Bearer ${token}`), 'still-valid token kept');

    const at = async (ms: number) => {
      mock.timers.tick(ms);
      await flush();
    };
    await at(4_999);
    assert.equal(refreshes(), 1);
    await at(1); // t = 5 s
    assert.equal(refreshes(), 2);
    await at(9_999);
    assert.equal(refreshes(), 2);
    await at(1); // t = 15 s
    assert.equal(refreshes(), 3);
    await at(20_000); // t = 35 s: the access token has now expired
    assert.equal(refreshes(), 4);
    await c.from('p').select();
    assert.equal(restCalls().at(-1)!.headers.Authorization, `Bearer ${ANON}`, 'expired token not sent');
    assert.equal(saved().refresh_token, 'rt-old', 'session kept');
    assert.deepEqual(events, []);
    assert.ok((await c.auth.getSession()).data.session, 'still signed in');

    down = false;
    await at(40_000); // t = 75 s
    assert.equal(refreshes(), 5);
    assert.deepEqual(events, ['TOKEN_REFRESHED']);
    assert.equal(saved().refresh_token, 'rt-new');
  } finally {
    mock.timers.reset();
  }
});

test('repeated 401s after a successful refresh do not loop: refreshes back off', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START });
  try {
    save({ ...live(3600), refresh_token: 'rt-old', user: owner });
    respond = (c) => (isRefresh(c) ? { status: 200, body: tokenResponse(3600, owner, `n${calls.length}`) } : { status: 401, body: { message: 'JWT invalid' } });
    const c = newClient();
    for (let t = 0; t < 40; t++) {
      await c.from('p').select();
      mock.timers.tick(1_000);
      await flush();
    }
    // t = 0, 5, 15, 35 s (5 s minimum, then 10 s, 20 s), not one per request.
    assert.equal(calls.filter(isRefresh).length, 4);
  } finally {
    mock.timers.reset();
  }
});

// --- 8. Offline after expiry --------------------------------------------------
test('offline after expiry: no sign-out, expired token not sent, retried on the online event', async () => {
  const events = new EventTarget();
  save({ ...live(-60), refresh_token: 'rt-old', user: owner });
  const expired = saved().access_token;
  let offline = true;
  respond = (c) => {
    if (isRefresh(c) && offline) throw new TypeError('Failed to fetch');
    return isRefresh(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: [] };
  };
  const c = newClient(events);
  const seen: string[] = [];
  c.auth.onAuthStateChange((e) => seen.push(e));

  await c.from('p').select();
  assert.equal(calls.filter(isRefresh).length, 1);
  assert.equal(restCalls()[0].headers.Authorization, `Bearer ${ANON}`);
  assert.equal(saved().access_token, expired, 'session kept');
  assert.deepEqual(seen, []);
  const restored = await restoreSessionWithPolicy({ client: c, env: OWNER_ENV, hostname: 'app.vercel.app' });
  assert.ok(restored.session, 'still signed in after a reload while offline');

  offline = false;
  events.dispatchEvent(new Event('online'));
  await flush();
  assert.equal(calls.filter(isRefresh).length, 2);
  assert.deepEqual(seen, ['TOKEN_REFRESHED']);
  assert.equal(saved().refresh_token, 'rt-new');
});

test('only a definitive rejection of the refresh token signs out', async () => {
  for (const [status, body] of [
    [500, { message: 'boom' }],
    [502, null],
    [429, { error_code: 'over_request_rate_limit' }],
    [401, '<html>proxy login</html>'],
  ] as const) {
    store.clear();
    calls = [];
    save({ ...live(-5), refresh_token: 'rt-old', user: owner });
    respond = (c) => (isRefresh(c) ? { status, body } : { status: 200, body: [] });
    const c = newClient();
    await c.auth.refreshSession();
    assert.equal(saved()?.refresh_token, 'rt-old', `kept on ${status}`);
  }
  for (const body of [
    { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' },
    { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' },
    { code: 400, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' },
  ]) {
    store.clear();
    save({ ...live(-5), refresh_token: 'rt-old', user: owner });
    respond = (c) => (isRefresh(c) ? { status: 400, body } : { status: 200, body: [] });
    await newClient().auth.refreshSession();
    assert.equal(saved(), null, JSON.stringify(body));
  }
  assert.equal(isRefreshRejected(401, { error: 'invalid_grant' }), true);
  assert.equal(isRefreshRejected(500, { error: 'invalid_grant' }), false);
});

// --- 9. Cross-tab -------------------------------------------------------------
const storageEvent = (key: string | null) => Object.assign(new Event('storage'), { key });

test("another tab's sign-out signs this tab out (storage event)", async () => {
  const events = new EventTarget();
  save({ ...live(3600), refresh_token: 'rt-a', user: owner });
  const c = newClient(events);
  const seen: [string, any][] = [];
  c.auth.onAuthStateChange((e, s) => seen.push([e, s]));

  events.dispatchEvent(storageEvent('some_other_key'));
  assert.deepEqual(seen, [], 'other keys are ignored');

  store.delete(SESSION_STORAGE_KEY); // the other tab signed out
  events.dispatchEvent(storageEvent(SESSION_STORAGE_KEY));
  assert.deepEqual(seen, [['SIGNED_OUT', null]]);
  await c.from('p').select();
  assert.equal(restCalls()[0].headers.Authorization, `Bearer ${ANON}`);
  assert.equal(calls.filter((x) => x.url.includes('/logout')).length, 0, 'this tab does not call logout again');

  // localStorage.clear() in another tab fires a storage event with key null.
  save({ ...live(3600), refresh_token: 'rt-b', user: owner });
  events.dispatchEvent(storageEvent(SESSION_STORAGE_KEY));
  store.clear();
  events.dispatchEvent(storageEvent(null));
  assert.deepEqual((seen as [string, any][]).map(([e]) => e), ['SIGNED_OUT', 'SIGNED_IN', 'SIGNED_OUT']);
});

test("another tab's refresh is picked up without refreshing again", async () => {
  const events = new EventTarget();
  save({ ...live(30, OWNER_ID, 'a'), refresh_token: 'rt-a', user: owner }); // near expiry
  const c = newClient(events);
  const seen: string[] = [];
  c.auth.onAuthStateChange((e) => seen.push(e));

  save({ ...live(3600, OWNER_ID, 'b'), refresh_token: 'rt-b', user: owner }); // the other tab refreshed
  events.dispatchEvent(storageEvent(SESSION_STORAGE_KEY));
  assert.deepEqual(seen, ['TOKEN_REFRESHED']);
  await c.from('p').select();
  assert.equal(calls.filter(isRefresh).length, 0);
  assert.equal(restCalls()[0].headers.Authorization, `Bearer ${saved().access_token}`);
});

test('sign-out revokes on the server, even when the access token has already expired', async () => {
  const revoke = tokenResponse(3600, owner, 'revoke');
  respond = (c) => (isRefresh(c) ? { status: 200, body: revoke } : { status: 200, body: {} });
  save({ ...live(3600, OWNER_ID, 'live'), refresh_token: 'rt-live', user: owner });
  await newClient().auth.signOut();
  assert.equal(saved(), null);
  assert.deepEqual(calls.map((c) => c.url.replace('https://example.supabase.co', '')), ['/auth/v1/logout']);

  calls = [];
  save({ ...live(-60, OWNER_ID, 'old'), refresh_token: 'rt-old', user: owner });
  await newClient().auth.signOut();
  assert.equal(saved(), null);
  assert.ok(isRefresh(calls[0]));
  assert.equal(calls[1].url, 'https://example.supabase.co/auth/v1/logout');
  assert.equal(calls[1].headers.Authorization, `Bearer ${revoke.access_token}`);
});

// --- 10. Sign-out / cross-tab change during an in-flight refresh -------------
const delay = <T>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

test('sign-out during an in-flight refresh: the refresh result is discarded', async () => {
  save({ ...live(30), refresh_token: 'rt-old', user: owner });
  respond = (c) => (isRefresh(c) ? delay(20, { status: 200, body: tokenResponse() }) : { status: 200, body: {} });
  const c = newClient();
  const seen: string[] = [];
  c.auth.onAuthStateChange((e) => seen.push(e));
  const pending = Promise.resolve(c.from('p').select()); // the builder runs on .then
  await flush();
  assert.equal(calls.filter(isRefresh).length, 1, 'refresh in flight');
  await c.auth.signOut();
  await pending;
  await delay(30, null);
  assert.equal(saved(), null, 'session not brought back');
  assert.deepEqual(seen, ['SIGNED_OUT']);
});

test('cross-tab sign-out during an in-flight refresh: the refresh result is discarded', async () => {
  const events = new EventTarget();
  save({ ...live(30), refresh_token: 'rt-old', user: owner });
  respond = (c) => (isRefresh(c) ? delay(20, { status: 200, body: tokenResponse() }) : { status: 200, body: [] });
  const c = newClient(events);
  const seen: string[] = [];
  c.auth.onAuthStateChange((e) => seen.push(e));
  const pending = Promise.resolve(c.from('p').select()); // the builder runs on .then
  await flush();
  assert.equal(calls.filter(isRefresh).length, 1, 'refresh in flight');
  store.delete(SESSION_STORAGE_KEY); // the other tab signed out
  events.dispatchEvent(Object.assign(new Event('storage'), { key: SESSION_STORAGE_KEY }));
  await pending;
  assert.equal(saved(), null);
  assert.deepEqual(seen, ['SIGNED_OUT']);
});

test('a refresh whose refresh token was replaced meanwhile is discarded', async () => {
  save({ ...live(30), refresh_token: 'rt-old', user: owner });
  respond = (c) => (isRefresh(c) ? delay(20, { status: 200, body: tokenResponse() }) : { status: 200, body: [] });
  const c = newClient();
  const pending = Promise.resolve(c.from('p').select()); // the builder runs on .then
  await flush();
  assert.equal(calls.filter(isRefresh).length, 1, 'refresh in flight');
  save({ ...live(3600, OWNER_ID, 'other'), refresh_token: 'rt-other', user: owner }); // no storage event yet
  await pending;
  assert.equal(saved().refresh_token, 'rt-other', 'the other session is not overwritten');
});

// --- 11. Multi-tab refresh race ----------------------------------------------
/** A FIFO lock like navigator.locks, shared by the "tabs". */
const makeLocks = () => {
  let tail: Promise<unknown> = Promise.resolve();
  const names: string[] = [];
  let held = 0;
  return {
    names,
    held: () => held,
    request<T>(name: string, opts: { signal?: AbortSignal }, cb: () => Promise<T>): Promise<T> {
      names.push(name);
      let granted = false;
      const run = tail.then(async () => {
        if (opts?.signal?.aborted) throw new DOMException('lock request aborted', 'AbortError');
        granted = true;
        held++;
        try {
          return await cb();
        } finally {
          held--;
        }
      });
      tail = run.catch(() => {});
      if (!opts?.signal) return run;
      // Like navigator.locks: aborting before the lock is granted rejects at once.
      return new Promise<T>((resolve, reject) => {
        opts.signal!.addEventListener('abort', () => !granted && reject(new DOMException('lock request aborted', 'AbortError')));
        run.then(resolve, reject);
      });
    },
  };
};
/** Supabase-like rotation: the first use of rt-old succeeds, any reuse is rejected. */
const rotatingServer = () => {
  const used = new Set<string>();
  return (c: Call) => {
    if (!isRefresh(c)) return { status: 200, body: [] };
    const rt = c.body.refresh_token;
    if (used.has(rt)) return delay(30, { status: 400, body: { code: 400, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' } });
    used.add(rt);
    return delay(10, { status: 200, body: tokenResponse() });
  };
};

test('two tabs refreshing at once: one network refresh under the lock, the other tab adopts it', async () => {
  save({ ...live(30), refresh_token: 'rt-old', user: owner });
  respond = rotatingServer();
  const locks = makeLocks();
  const a = newClient(null, locks);
  const b = newClient(null, locks);
  const seen: string[] = [];
  a.auth.onAuthStateChange((e) => seen.push(`a:${e}`));
  b.auth.onAuthStateChange((e) => seen.push(`b:${e}`));
  await Promise.all([a.from('p').select(), b.from('p').select()]);
  assert.equal(calls.filter(isRefresh).length, 1, 'only one tab hit the network');
  assert.deepEqual(locks.names, ['ehi_auth_refresh', 'ehi_auth_refresh']);
  assert.equal(saved().refresh_token, 'rt-new');
  assert.deepEqual(seen.sort(), ['a:TOKEN_REFRESHED', 'b:TOKEN_REFRESHED']);
  for (const r of restCalls()) assert.equal(r.headers.Authorization, `Bearer ${saved().access_token}`);
});

test('without locks: a rejected refresh adopts the newer token another tab stored instead of signing out', async () => {
  save({ ...live(30), refresh_token: 'rt-old', user: owner });
  respond = rotatingServer();
  const a = newClient();
  const b = newClient();
  const seen: string[] = [];
  a.auth.onAuthStateChange((e) => seen.push(`a:${e}`));
  b.auth.onAuthStateChange((e) => seen.push(`b:${e}`));
  await Promise.all([a.from('p').select(), b.from('p').select()]);
  assert.equal(calls.filter(isRefresh).length, 2, 'both tabs raced');
  assert.equal(saved()?.refresh_token, 'rt-new', 'still signed in');
  assert.ok(!seen.some((e) => e.endsWith('SIGNED_OUT')), seen.join());
  for (const r of restCalls()) assert.equal(r.headers.Authorization, `Bearer ${saved().access_token}`);
});

// --- 12. Short lifetimes, missing expires_in -----------------------------------
test('very short token lifetimes (20 s) refresh on schedule and never drift into backoff', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START });
  try {
    let n = 0;
    respond = (c) => (isTokenCall(c) ? { status: 200, body: tokenResponse(20, owner, `s${++n}`) } : { status: 200, body: [] });
    const c = newClient();
    await c.auth.signInWithPassword({ email: 'sanni@example.com', password: 'pw' });
    for (let t = 0; t < 300; t++) {
      await c.from('p').select();
      mock.timers.tick(1_000);
      await flush();
    }
    assert.ok(restCalls().every((r) => r.headers.Authorization !== `Bearer ${ANON}`), 'every request had a live token');
    const refreshes = calls.filter(isRefresh).length;
    assert.ok(refreshes >= 28 && refreshes <= 31, `refreshes every ~10 s, got ${refreshes}`);
  } finally {
    mock.timers.reset();
  }
});

test('a refresh without a usable expires_in keeps the rotated tokens with a 5 min fallback expiry', async () => {
  for (const extra of [{}, { expires_in: 0 }, { expires_in: 'soon' }]) {
    store.clear();
    calls = [];
    save({ ...live(-5), refresh_token: 'rt-old', user: owner });
    const body: any = { access_token: jwt(3600, OWNER_ID, 'noexp'), refresh_token: 'rt-rotated', token_type: 'bearer', ...extra };
    respond = (c) => (isRefresh(c) ? { status: 200, body } : { status: 200, body: [] });
    const before = Date.now();
    const r = await newClient().auth.refreshSession();
    assert.equal(r.error, null, JSON.stringify(extra));
    assert.equal(saved().refresh_token, 'rt-rotated');
    assert.equal(saved().expires_in, 300);
    assert.ok(Math.abs(saved().expiresAtLocal - (before + 300_000)) < 2_000);
  }
});

// --- 13. Proxy cache drop on sign-out -----------------------------------------
test('sign-out calls the pre-sign-out hook (proxy cache drop) before revoking, best effort', async () => {
  save({ ...live(3600), refresh_token: 'rt', user: owner });
  const token = saved().access_token;
  const order: string[] = [];
  respond = (c) => {
    order.push(c.url.replace('https://example.supabase.co', ''));
    return { status: 200, body: {} };
  };
  const c = newClient();
  c.setBeforeSignOut(async (t: string) => void order.push(`hook:${t === token}`));
  await c.auth.signOut();
  assert.deepEqual(order, ['hook:true', '/auth/v1/logout']);

  // A failing hook does not stop the sign-out or the revoke.
  order.length = 0;
  save({ ...live(3600), refresh_token: 'rt', user: owner });
  const c2 = newClient();
  c2.setBeforeSignOut(() => {
    throw new Error('proxy down');
  });
  await c2.auth.signOut();
  assert.equal(saved(), null);
  assert.deepEqual(order, ['/auth/v1/logout']);
});

// --- 14. Owner email not in the bundle -----------------------------------------
test('built bundle: the owner email is left out when VITE_OWNER_USER_ID is set', { skip: process.env.SKIP_BUNDLE_TEST === '1' }, () => {
  const root = new URL('../../', import.meta.url).pathname;
  const build = (env: Record<string, string>) => {
    const out = mkdtempSync(join(tmpdir(), 'ehi-bundle-'));
    const r = spawnSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], {
      cwd: root,
      env: { ...process.env, VITE_SUPABASE_URL: 'https://sentinel.example', VITE_SUPABASE_ANON_KEY: 'SENTINEL_ANON', VITE_UNRELATED_SECRET: 'SENTINEL_UNRELATED', ...env },
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    const js = readdirSync(join(out, 'assets'))
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(join(out, 'assets', f), 'utf8'))
      .join('\n');
    rmSync(out, { recursive: true, force: true });
    return js;
  };
  const withId = build({ VITE_OWNER_USER_ID: 'SENTINEL_OWNER_ID', VITE_OWNER_EMAILS: 'sentinel-owner@example.com' });
  assert.ok(withId.includes('SENTINEL_OWNER_ID'));
  assert.ok(!withId.includes('sentinel-owner@example.com'), 'owner email must not be in the bundle');
  assert.ok(!withId.includes('SENTINEL_UNRELATED'), 'unrelated VITE_ vars must not be in the bundle');
  const emailOnly = build({ VITE_OWNER_USER_ID: '', VITE_OWNER_EMAILS: 'sentinel-owner@example.com' });
  assert.ok(emailOnly.includes('sentinel-owner@example.com'), 'email fallback still works when no id is set');
  // A blank id (' , ') counts as unset here too, so the email fallback is kept.
  const blankId = build({ VITE_OWNER_USER_ID: ' , ', VITE_OWNER_EMAILS: 'sentinel-owner@example.com' });
  assert.ok(blankId.includes('sentinel-owner@example.com'), 'a blank id does not drop the email fallback');
});

// --- 15. Hung refresh: timeout, lock always released ----------------------------
/** A request that never answers until it is aborted. */
const hang = (c: Call) =>
  new Promise<Reply>((_, reject) => {
    c.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
  });

test('a hung refresh times out after 15 s: lock released, the other tab proceeds, session kept', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START });
  try {
    save({ ...live(60), refresh_token: 'rt-old', user: owner }); // inside the 60 s margin
    let n = 0;
    respond = (c) => (isRefresh(c) ? (++n === 1 ? hang(c) : { status: 200, body: tokenResponse() }) : { status: 200, body: [] });
    const locks = makeLocks();
    const a = newClient(null, locks);
    const b = newClient(null, locks);
    const seen: string[] = [];
    a.auth.onAuthStateChange((e) => seen.push(`a:${e}`));
    b.auth.onAuthStateChange((e) => seen.push(`b:${e}`));

    const pa = Promise.resolve(a.from('p').select());
    await flush();
    const pb = Promise.resolve(b.from('p').select());
    await flush();
    assert.equal(calls.filter(isRefresh).length, 1, "tab A's refresh hangs, tab B waits for the lock");
    assert.equal(locks.held(), 1);

    mock.timers.tick(14_999);
    await flush();
    assert.equal(calls.filter(isRefresh).length, 1, 'not aborted early');
    mock.timers.tick(1);
    await flush();
    assert.ok(calls.filter(isRefresh)[0].signal?.aborted, 'the hung request was aborted');
    await Promise.all([pa, pb]);
    assert.equal(locks.held(), 0, 'lock released');
    assert.equal(calls.filter(isRefresh).length, 2, 'tab B refreshed after A gave up');
    assert.equal(saved()?.refresh_token, 'rt-new', 'session kept and refreshed');
    assert.ok(!seen.some((e) => e.endsWith('SIGNED_OUT')), seen.join());
  } finally {
    mock.timers.reset();
  }
});

test('a hung refresh in a single tab counts as a network error: session kept, retried with backoff', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START });
  try {
    save({ ...live(-5), refresh_token: 'rt-old', user: owner });
    let n = 0;
    respond = (c) => (isRefresh(c) ? (++n === 1 ? hang(c) : { status: 200, body: tokenResponse() }) : { status: 200, body: [] });
    const c = newClient(null, makeLocks());
    const seen: string[] = [];
    c.auth.onAuthStateChange((e) => seen.push(e));
    const pending = Promise.resolve(c.auth.refreshSession());
    await flush();
    mock.timers.tick(15_000);
    await flush();
    const r = await pending;
    assert.equal(r.data.session, null, 'no live token yet');
    assert.equal(saved()?.refresh_token, 'rt-old', 'session kept');
    assert.deepEqual(seen, []);
    mock.timers.tick(5_000); // backoff retry
    await flush();
    assert.equal(calls.filter(isRefresh).length, 2);
    assert.equal(saved().refresh_token, 'rt-new');
    assert.deepEqual(seen, ['TOKEN_REFRESHED']);
  } finally {
    mock.timers.reset();
  }
});

test('waiting for a lock that is never released gives up after 20 s without signing out', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START });
  try {
    save({ ...live(30), refresh_token: 'rt-old', user: owner });
    respond = (c) => (isRefresh(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: [] });
    const locks = makeLocks();
    void locks.request('ehi_auth_refresh', {}, () => new Promise(() => {})); // a frozen tab holds it forever
    const c = newClient(null, locks);
    const seen: string[] = [];
    c.auth.onAuthStateChange((e) => seen.push(e));
    const pending = Promise.resolve(c.from('p').select());
    await flush();
    mock.timers.tick(20_000);
    await flush();
    await pending;
    assert.equal(calls.filter(isRefresh).length, 0, 'never refreshed without the lock');
    assert.equal(restCalls()[0].headers.Authorization, `Bearer ${saved().access_token}`, 'the still-valid token was used');
    assert.equal(saved().refresh_token, 'rt-old');
    assert.deepEqual(seen, []);
  } finally {
    mock.timers.reset();
  }
});

test('sign-out with a hung revoke still finishes (15 s timeout)', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: SERVER_START });
  try {
    save({ ...live(3600), refresh_token: 'rt', user: owner });
    respond = (c) => (c.url.endsWith('/logout') ? hang(c) : { status: 200, body: {} });
    let done = false;
    const pending = newClient().auth.signOut().then(() => (done = true));
    await flush();
    assert.equal(saved(), null, 'signed out locally at once');
    mock.timers.tick(15_000);
    await flush();
    await pending;
    assert.equal(done, true);
  } finally {
    mock.timers.reset();
  }
});

// --- 16. Owner config: whitespace and fail closed --------------------------------
test('owner settings are trimmed and comma-split; blank counts as unset', () => {
  for (const blank of [' ', ' , ', '', ',,', '\t, \n']) {
    assert.deepEqual(readOwnerConfig({ VITE_OWNER_USER_ID: blank }).userIds, [], JSON.stringify(blank));
    // A blank id does not hide the email fallback.
    assert.deepEqual(readOwnerConfig({ VITE_OWNER_USER_ID: blank, VITE_OWNER_EMAILS: ' Sanni@Example.com , ' }).emails, ['sanni@example.com']);
  }
  assert.deepEqual(readOwnerConfig({ VITE_OWNER_USER_ID: `  ${OWNER_ID}  ` }).userIds, [OWNER_ID]);
  assert.deepEqual(readOwnerConfig({ VITE_OWNER_USER_ID: ` a , ${OWNER_ID} ,` }).userIds, ['a', OWNER_ID]);
  assert.equal(isOwner(owner, readOwnerConfig({ VITE_OWNER_USER_ID: ` ${OWNER_ID} ` })), true);
});

test('with no owner configured (unset, a space, " , "), every account is refused', async () => {
  respond = (c) => (isTokenCall(c) ? { status: 200, body: tokenResponse() } : { status: 200, body: {} });
  for (const env of [{}, { VITE_OWNER_USER_ID: ' ' }, { VITE_OWNER_USER_ID: ' , ' }, { VITE_OWNER_USER_ID: ' ', VITE_OWNER_EMAILS: ' , ' }]) {
    store.clear();
    calls = [];
    const r = await signInWithPolicy('sanni@example.com', 'pw', { client: newClient(), env, hostname: 'app.vercel.app' });
    assert.equal(r.session, null, JSON.stringify(env));
    assert.equal(r.error?.message, OWNER_NOT_CONFIGURED_MESSAGE);
    assert.equal(saved(), null, 'signed straight back out');
    assert.ok(calls.some((c) => c.url.endsWith('/auth/v1/logout')), 'refresh token revoked');
  }
  // On reload too.
  save({ ...tokenResponse(), expiresAtLocal: Date.now() + 3600_000 });
  const restored = await restoreSessionWithPolicy({ client: newClient(), env: { VITE_OWNER_USER_ID: ' ' }, hostname: 'app.vercel.app' });
  assert.equal(restored.session, null);
  assert.equal(saved(), null);
  // An id with spaces around it still lets the owner in.
  store.clear();
  const ok = await signInWithPolicy('sanni@example.com', 'pw', { client: newClient(), env: { VITE_OWNER_USER_ID: `  ${OWNER_ID}  ` }, hostname: 'app.vercel.app' });
  assert.equal(ok.error, null);
});

test('the localhost demo fallback is unchanged with no owner configured', async () => {
  const r = await signInWithPolicy('op@x.com', 'p', { client: failingClient, env: { VITE_DEMO_MODE: 'true' }, hostname: 'localhost' });
  assert.equal(r.error, null);
  assert.equal(r.session?.local_demo, true);
});
