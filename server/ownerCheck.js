/**
 * Server-side owner check: a valid Supabase session is not enough, the user
 * id must also be the owner's (OWNER_USER_ID, or a short ALLOWED_USER_IDS
 * list). Otherwise the server answers 403. Without this, anyone who can sign
 * up to the Supabase project would have a valid session.
 *
 * Self-contained on purpose: it is not wired in yet. After PR #3
 * (fix/secure-proxy) merges, server/proxySecurity.js `authenticate` calls
 * `assertOwner(auth.owner, user)` on every Supabase user it returns (cached
 * or fresh), and `loadAuthConfig` adds `owner: loadOwnerConfig(env)` and its
 * errors. API-key and local-dev callers are not Supabase users and pass
 * through unchanged.
 */

export class OwnerCheckError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OwnerCheckError';
    this.status = 403;
  }
}

const list = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Reads OWNER_USER_ID and ALLOWED_USER_IDS (comma-separated Supabase user ids).
 * `required` is true when Supabase auth is configured: then an empty list is
 * a startup error, because every Supabase user would get 403 (fail closed).
 */
export function loadOwnerConfig(env = process.env) {
  const userIds = [...new Set([...list(env.OWNER_USER_ID), ...list(env.ALLOWED_USER_IDS)])];
  const supabaseAuth = Boolean(
    (env.SUPABASE_URL || env.VITE_SUPABASE_URL) && (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)
  );
  const errors = [];
  if (supabaseAuth && userIds.length === 0) {
    errors.push('Supabase sign-in is configured but OWNER_USER_ID is not set; set it to your Supabase user id.');
  }
  return { userIds, errors };
}

/**
 * Returns `user` if it may use the server, else throws OwnerCheckError (403).
 * Only Supabase users ({ kind: 'supabase' }) are checked; an empty owner list
 * refuses every Supabase user.
 */
export function assertOwner(config, user) {
  if (!user || user.kind !== 'supabase') return user;
  const ids = config?.userIds || [];
  if (typeof user.id === 'string' && ids.includes(user.id)) return user;
  throw new OwnerCheckError('This app is locked to its owner');
}
