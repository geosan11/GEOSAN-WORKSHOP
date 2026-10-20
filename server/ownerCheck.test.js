import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OwnerCheckError, assertOwner, loadOwnerConfig } from './ownerCheck.js';

const OWNER = '11111111-1111-1111-1111-111111111111';
const supa = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };

test('loadOwnerConfig reads OWNER_USER_ID and ALLOWED_USER_IDS', () => {
  const cfg = loadOwnerConfig({ ...supa, OWNER_USER_ID: ` ${OWNER} `, ALLOWED_USER_IDS: `u2, ${OWNER},u3` });
  assert.deepEqual(cfg.userIds, [OWNER, 'u2', 'u3']);
  assert.deepEqual(cfg.errors, []);
});

test('Supabase auth without an owner id is a startup error', () => {
  assert.equal(loadOwnerConfig(supa).errors.length, 1);
  assert.equal(loadOwnerConfig({ VITE_SUPABASE_URL: 'u', VITE_SUPABASE_ANON_KEY: 'k' }).errors.length, 1);
  assert.deepEqual(loadOwnerConfig({ PROXY_API_KEY: 'k' }).errors, []);
});

test('the owner passes, any other Supabase user gets 403', () => {
  const cfg = loadOwnerConfig({ ...supa, OWNER_USER_ID: OWNER });
  const owner = { kind: 'supabase', id: OWNER, email: 'me@x' };
  assert.equal(assertOwner(cfg, owner), owner);
  assert.throws(
    () => assertOwner(cfg, { kind: 'supabase', id: 'someone-else', email: 'me@x' }),
    (e) => e instanceof OwnerCheckError && e.status === 403
  );
  assert.throws(() => assertOwner(cfg, { kind: 'supabase' }), OwnerCheckError);
});

test('with no owner configured every Supabase user is refused (fail closed)', () => {
  assert.throws(() => assertOwner(loadOwnerConfig(supa), { kind: 'supabase', id: OWNER }), OwnerCheckError);
});

test('API-key and local-dev callers are not Supabase users and pass through', () => {
  const cfg = loadOwnerConfig({ ...supa, OWNER_USER_ID: OWNER });
  assert.deepEqual(assertOwner(cfg, { kind: 'api-key' }), { kind: 'api-key' });
  assert.deepEqual(assertOwner(cfg, { kind: 'local-dev' }), { kind: 'local-dev' });
});
