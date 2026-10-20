// Run: npx tsx --test src/lib/signinLockdown.test.ts
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

const { ProductionSupabaseClient, SESSION_STORAGE_KEY, isRefreshRejected } = await import('./supabase.ts');
const { signInWithPolicy, restoreSessionWithPolicy, OWNER_LOCK_MESSAGE, isStaffFallbackAllowed } = await import('./authPolicy.ts');

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
const newClient = (events: any = null) => {
  const c = new ProductionSupabaseClient('https://example.supabase.co', ANON, { events });
  clients.push(c);
  return c;
};
const owner = { id: OWNER_ID, email: 'sanni@example.com' };
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
  const r = await signInWithPolicy('sanni@example.com', 'pw', { client: c, env: {}, hostname: 'app.vercel.app' });
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
  for (const env of [{ VITE_OWNER_USER_ID: `other, ${OWNER_ID}` }, { VITE_OWNER_EMAILS: 'SANNI@example.com' }, {}]) {
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
  const restored = await restoreSessionWithPolicy({ client: c, env: {}, hostname: 'app.vercel.app' });
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
