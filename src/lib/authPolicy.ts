/**
 * Sign-in rules, kept free of React so they can be tested with node:test.
 *
 * - The "staff operator" fallback (any email gets in when Supabase sign-in
 *   fails) only works in local demo mode: VITE_DEMO_MODE=true AND the page is
 *   on localhost / 127.0.0.1 / [::1]. Anywhere else a failed sign-in is an error.
 * - If VITE_OWNER_USER_ID is set, any other account is signed straight back
 *   out. VITE_OWNER_EMAILS is an optional fallback used only when no id is
 *   set; like every VITE_* value it ends up in the public JS bundle, so prefer
 *   the id. This is defence in depth only: the database rules
 *   (supabase/migrations, docs/SECURITY-DB.md) are the real lock.
 */
import { SESSION_STORAGE_KEY, type ProductionSupabaseClient } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    org_id: string;
    org_role?: string;
    full_name?: string;
  };
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  /** Set only on the local demo staff session. */
  local_demo?: true;
}

export type AuthEnv = Record<string, string | boolean | undefined>;

export const OWNER_LOCK_MESSAGE = 'This app is locked to its owner.';
export const FALLBACK_REFUSED_MESSAGE = 'Sign-in failed. Check your email and password and try again.';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** undefined outside Vite (e.g. node:test), where import.meta.env does not exist. */
function readVar(read: () => string | boolean | undefined): string | boolean | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/**
 * Each variable is read by its full static name (import.meta.env.VITE_X) so
 * Vite inlines just that value. Never read `import.meta.env` as a whole
 * object: Vite would then inline every VITE_* variable into the bundle.
 */
function viteEnv(): AuthEnv {
  return {
    VITE_DEMO_MODE: readVar(() => import.meta.env.VITE_DEMO_MODE),
    VITE_OWNER_USER_ID: readVar(() => import.meta.env.VITE_OWNER_USER_ID),
    // Emails are only a fallback for when no owner id is set. Written as a
    // static ternary so that, when VITE_OWNER_USER_ID is set, Vite folds it
    // away and the owner's email never reaches the public bundle.
    VITE_OWNER_EMAILS: readVar(() => (import.meta.env.VITE_OWNER_USER_ID ? undefined : import.meta.env.VITE_OWNER_EMAILS)),
  };
}

function pageHostname(): string {
  return typeof window !== 'undefined' && window.location ? window.location.hostname : '';
}

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(String(hostname || '').toLowerCase());
}

/** The staff fallback is allowed only with VITE_DEMO_MODE=true on a localhost page. */
export function isStaffFallbackAllowed(env: AuthEnv = viteEnv(), hostname: string = pageHostname()): boolean {
  return env.VITE_DEMO_MODE === 'true' && isLocalHostname(hostname);
}

export interface OwnerConfig {
  userIds: string[];
  emails: string[];
}

const list = (v: unknown) =>
  String(v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * VITE_OWNER_USER_ID (comma-separated ids, preferred) and VITE_OWNER_EMAILS
 * (comma-separated, optional, public in the bundle; ignored when an id is set).
 */
export function readOwnerConfig(env: AuthEnv = viteEnv()): OwnerConfig {
  return {
    userIds: list(env.VITE_OWNER_USER_ID),
    emails: list(env.VITE_OWNER_EMAILS).map((e) => e.toLowerCase()),
  };
}

/**
 * True when no owner is configured, or the user is the owner: by id when
 * VITE_OWNER_USER_ID is set (emails are then ignored), else by email.
 */
export function isOwner(user: { id?: string; email?: string } | null | undefined, config: OwnerConfig): boolean {
  if (!config.userIds.length && !config.emails.length) return true;
  if (!user) return false;
  if (config.userIds.length) return Boolean(user.id && config.userIds.includes(user.id));
  return Boolean(user.email && config.emails.includes(user.email.toLowerCase()));
}

export function toAuthUser(sbUser: any, fallbackEmail = '', defaultRole = 'member'): AuthUser {
  const email = sbUser?.email || fallbackEmail;
  return {
    id: sbUser.id,
    email,
    user_metadata: {
      org_id: (sbUser.user_metadata?.org_id as string) || 'org-ehi-global',
      org_role: (sbUser.user_metadata?.org_role as string) || defaultRole,
      full_name: (sbUser.user_metadata?.full_name as string) || (email ? email.split('@')[0] : ''),
    },
  };
}

function buildStaffSession(email: string): AuthSession {
  const cleanEmail = email.trim();
  return {
    user: {
      id: `usr-operator-${Date.now().toString(36)}`,
      email: cleanEmail,
      user_metadata: {
        org_id: 'org-ehi-global',
        org_role: 'owner',
        full_name: cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'Staff Operator',
      },
    },
    access_token: `ehi-operator-${Date.now()}`,
    local_demo: true,
  };
}

type AuthClient = Pick<ProductionSupabaseClient, 'auth'>;

export interface PolicyOptions {
  client: AuthClient | null;
  env?: AuthEnv;
  hostname?: string;
}

export type PolicyResult = { session: AuthSession | null; error: Error | null };

/** Supabase sign-in, then the owner check, then (local demo only) the staff fallback. */
export async function signInWithPolicy(email: string, password: string, opts: PolicyOptions): Promise<PolicyResult> {
  const env = opts.env ?? viteEnv();
  const hostname = opts.hostname ?? pageHostname();
  let failure: Error | null = null;

  if (opts.client) {
    try {
      const { data, error } = await opts.client.auth.signInWithPassword({ email, password });
      // The REST token endpoint returns { access_token, user, ... } at the top level.
      const accessToken: string | undefined = data?.session?.access_token ?? data?.access_token;
      if (!error && accessToken && data?.user) {
        const user = toAuthUser(data.user, email, 'owner');
        if (!isOwner(user, readOwnerConfig(env))) {
          await opts.client.auth.signOut();
          return { session: null, error: new Error(OWNER_LOCK_MESSAGE) };
        }
        // The client has already stored the full session (with refresh token).
        return { session: { user, access_token: accessToken }, error: null };
      }
      failure = error instanceof Error ? error : null;
    } catch (err) {
      failure = err instanceof Error ? err : null;
    }
  }

  if (email.trim() && isStaffFallbackAllowed(env, hostname)) {
    const staff = buildStaffSession(email);
    if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(staff));
    return { session: staff, error: null };
  }

  if (!opts.client) {
    return { session: null, error: new Error('Sign-in is not set up: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing.') };
  }
  const detail = failure?.message && failure.message !== 'Authentication failed' ? ` (${failure.message})` : '';
  return { session: null, error: new Error(`${FALLBACK_REFUSED_MESSAGE}${detail}`) };
}

/**
 * The session to restore on page load: a local demo staff session only where
 * the fallback is allowed (otherwise it is deleted), else the Supabase
 * session (refreshed if needed) if it belongs to the owner.
 */
export async function restoreSessionWithPolicy(opts: PolicyOptions): Promise<PolicyResult> {
  const env = opts.env ?? viteEnv();
  const hostname = opts.hostname ?? pageHostname();

  let raw: any = null;
  try {
    raw = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null') : null;
  } catch {}
  if (raw?.local_demo) {
    if (isStaffFallbackAllowed(env, hostname) && raw.user) return { session: raw as AuthSession, error: null };
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return { session: null, error: null };
  }

  if (!opts.client) return { session: null, error: null };
  const {
    data: { session },
  } = await opts.client.auth.getSession();
  if (!session?.user) return { session: null, error: null };
  return checkOwner(session, opts.client, env);
}

/** Owner check for a Supabase session (sign-in, restore, or refresh). */
export async function checkOwner(sbSession: any, client: AuthClient, env: AuthEnv = viteEnv()): Promise<PolicyResult> {
  const user = toAuthUser(sbSession.user);
  if (!isOwner(user, readOwnerConfig(env))) {
    await client.auth.signOut();
    return { session: null, error: new Error(OWNER_LOCK_MESSAGE) };
  }
  return { session: { user, access_token: sbSession.access_token }, error: null };
}
