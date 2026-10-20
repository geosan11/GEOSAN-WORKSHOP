/**
 * Supabase Production Client
 * Connected to: https://zxdxsizyvotkcsrtzscw.supabase.co
 * Supports REST queries, auth, and graceful fallback when schema tables are being initialized.
 */

export interface SupabaseResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export const SESSION_STORAGE_KEY = 'ehi_auth_session';

/** Refresh this many seconds before the access token expires (capped at half the token's lifetime). */
export const REFRESH_MARGIN_SECONDS = 60;
/** Never refresh more often than this, even when a refresh looks due straight away. */
export const MIN_REFRESH_DELAY_MS = 5_000;
/** Upper bound for the exponential backoff after failed or repeated refreshes. */
export const MAX_REFRESH_BACKOFF_MS = 5 * 60_000;
/**
 * A successful refresh sooner than min(30 s, lifetime / 4) after the previous
 * one counts as "repeated" and backs off. Scaling with the lifetime keeps very
 * short-lived tokens (refreshed every lifetime / 2) out of the backoff.
 */
const REPEATED_REFRESH_WINDOW_MS = 30_000;
/** Used when the token endpoint gives no usable expires_in (and no exp - iat). */
export const FALLBACK_TOKEN_LIFETIME_SECONDS = 5 * 60;
/** navigator.locks name that serialises refreshes across tabs. */
export const REFRESH_LOCK_NAME = 'ehi_auth_refresh';
/**
 * Auth requests (refresh, sign-out revoke) are aborted after this long. A
 * timed-out refresh counts as a network error: the session is kept and the
 * refresh retried with backoff. It also bounds how long a tab holds the lock.
 */
export const AUTH_REQUEST_TIMEOUT_MS = 15_000;
/** Give up waiting for another tab's refresh lock after this long (treated as a temporary failure). */
export const REFRESH_LOCK_WAIT_MS = 20_000;
/** How long sign-out waits for the pre-sign-out hook (proxy cache drop) before revoking. */
const SIGN_OUT_HOOK_TIMEOUT_MS = 2_000;

/**
 * A Supabase session as returned by /auth/v1/token, plus expiresAtLocal.
 *
 * Expiry is tracked on the device's own clock: expiresAtLocal = (local time
 * the token request was sent) + expires_in. The JWT `exp` and the server's
 * `expires_at` are server-clock times and are NOT compared with Date.now(),
 * because a device clock that is a few minutes off would make every token
 * look expired (refresh loop) or valid for too long.
 */
export interface StoredSession {
  access_token: string;
  refresh_token?: string;
  /** Unix ms on the device clock when the access token expires. */
  expiresAtLocal?: number;
  /** Token lifetime in seconds, from the token endpoint. */
  expires_in?: number;
  /** Server-clock unix seconds, as sent by Supabase. Stored, never compared with the local clock. */
  expires_at?: number;
  token_type?: string;
  user?: any;
  [key: string]: any;
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

function base64UrlDecode(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

/** True for a three-part token whose payload is JSON (a JWT). Placeholders like 'ehi-operator-…' are not. */
export function isJwt(token: unknown): token is string {
  return typeof token === 'string' && token.split('.').length === 3 && jwtPayload(token) !== null;
}

function jwtPayload(token: string): any | null {
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** When the session's access token expires, in unix ms on the device clock, or null if unknown. */
export function sessionExpiresAtLocal(session: StoredSession | null | undefined): number | null {
  if (!session || typeof session.access_token !== 'string') return null;
  return finite(session.expiresAtLocal) ? session.expiresAtLocal : null;
}

/** How long before expiry to refresh: REFRESH_MARGIN_SECONDS, or half the lifetime for short-lived tokens. */
export function refreshMarginMs(session: StoredSession | null | undefined): number {
  const margin = REFRESH_MARGIN_SECONDS * 1000;
  const lifetime = finite(session?.expires_in) && session!.expires_in! > 0 ? session!.expires_in! * 1000 : null;
  return lifetime === null ? margin : Math.min(margin, lifetime / 2);
}

/**
 * True if the token expires within marginMs (device clock). A token with no
 * known local expiry counts as expired, so we never send a token we can't
 * vouch for (it gets refreshed instead, if there is a refresh token).
 */
export function isSessionExpired(session: StoredSession | null | undefined, marginMs = 0, nowMs = Date.now()): boolean {
  const exp = sessionExpiresAtLocal(session);
  return exp === null || exp - marginMs <= nowMs;
}

function readStoredSession(): StoredSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function storedJwt(): string | null {
  const s = readStoredSession();
  return s && isJwt(s.access_token) ? s.access_token : null;
}

function clearStoredSession(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Supabase token-endpoint JSON -> the session we store (keeps refresh_token,
 * adds expiresAtLocal). requestedAt is the local time the token request was
 * sent, so the local expiry errs on the early side by the round trip.
 */
function normalizeSession(json: any, previous: StoredSession | null | undefined, requestedAt: number): StoredSession {
  const session: StoredSession = { ...json };
  delete session.expiresAtLocal;
  if (!session.user && previous?.user) session.user = previous.user;
  const usable = (v: unknown): v is number => finite(v) && v > 0;
  let lifetime: number | null = usable(json.expires_in) ? json.expires_in : null;
  if (lifetime === null) {
    // No expires_in: exp - iat is a duration, so it is still clock-independent.
    const p = jwtPayload(String(session.access_token));
    if (finite(p?.exp) && finite(p?.iat) && usable(p.exp - p.iat)) lifetime = p.exp - p.iat;
  }
  // Still nothing usable: keep the (rotated) tokens with a short, conservative
  // expiry rather than dropping them; we just refresh again sooner.
  if (lifetime === null) lifetime = FALLBACK_TOKEN_LIFETIME_SECONDS;
  session.expires_in = lifetime;
  session.expiresAtLocal = requestedAt + lifetime * 1000;
  return session;
}

/**
 * True only when Supabase definitively rejected the refresh token (400/401
 * with invalid_grant or a refresh-token/session error code). Anything else
 * (network error, 5xx, 429, a proxy's HTML page) is treated as temporary.
 */
const REJECTED_REFRESH_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
  'user_not_found',
  'user_banned',
]);
export function isRefreshRejected(status: number, json: any): boolean {
  if (status !== 400 && status !== 401) return false;
  if (!json || typeof json !== 'object') return false;
  if (json.error === 'invalid_grant') return true;
  if (REJECTED_REFRESH_CODES.has(json.error_code)) return true;
  return /invalid refresh token/i.test(String(json.msg || json.error_description || ''));
}

/**
 * The signed-in user's Supabase access token (a JWT), if there is one and it
 * has not expired. The database only lets the owner account read or write
 * (see docs/SECURITY-DB.md), so table requests must carry the user's token,
 * not just the anon key. Non-JWT placeholder tokens and expired tokens are
 * ignored. Used only when a query builder has no client to refresh through.
 */
function getStoredAccessToken(): string | null {
  const saved = readStoredSession();
  const token = saved?.access_token;
  return isJwt(token) && !isSessionExpired(saved) ? token : null;
}

/** What a query builder needs from the client to get (and refresh) the user's token. */
export interface AccessTokenSource {
  getAccessToken(): Promise<string | null>;
  refreshAfterUnauthorized(rejectedToken: string): Promise<string | null>;
}

export class PostgrestQueryBuilder {
  private url: string;
  private apikey: string;
  private table: string;
  private queryParams: URLSearchParams;
  private bodyData?: any;
  private httpMethod: string = 'GET';
  private tokens?: AccessTokenSource;

  constructor(url: string, apikey: string, table: string, tokens?: AccessTokenSource) {
    this.url = url.replace(/\/+$/, '');
    this.apikey = apikey;
    this.table = table;
    this.tokens = tokens;
    this.queryParams = new URLSearchParams();
  }

  select(columns: string = '*'): this {
    this.queryParams.set('select', columns);
    return this;
  }

  eq(column: string, value: string | number): this {
    this.queryParams.set(column, `eq.${value}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const dir = options?.ascending === false ? 'desc' : 'asc';
    this.queryParams.set('order', `${column}.${dir}`);
    return this;
  }

  limit(count: number): this {
    this.queryParams.set('limit', String(count));
    return this;
  }

  insert(values: any): this {
    this.httpMethod = 'POST';
    this.bodyData = values;
    return this;
  }

  update(values: any): this {
    this.httpMethod = 'PATCH';
    this.bodyData = values;
    return this;
  }

  delete(): this {
    this.httpMethod = 'DELETE';
    return this;
  }

  single(): this {
    this.queryParams.set('limit', '1');
    return this;
  }

  upsert(values: any): this {
    this.httpMethod = 'POST';
    this.bodyData = values;
    return this;
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const endpoint = `${this.url}/rest/v1/${this.table}?${this.queryParams.toString()}`;
      const send = (token: string | null) =>
        fetch(endpoint, {
          method: this.httpMethod,
          headers: {
            apikey: this.apikey,
            // No valid user token means signed out: send only the anon key.
            Authorization: `Bearer ${token || this.apikey}`,
            'Content-Type': 'application/json',
            Prefer: this.httpMethod === 'POST' ? 'return=representation' : 'count=none',
          },
          body: this.bodyData ? JSON.stringify(this.bodyData) : undefined,
        });

      const token = this.tokens ? await this.tokens.getAccessToken() : getStoredAccessToken();
      let res = await send(token);
      // A 401 with a user token: refresh once and retry. If the refresh
      // fails the client has already signed out, so return the 401.
      if (res.status === 401 && token && this.tokens) {
        const fresh = await this.tokens.refreshAfterUnauthorized(token);
        if (fresh) res = await send(fresh);
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({ message: res.statusText }));
        const result: SupabaseResponse = { data: null, error: new Error(errorJson.message || `HTTP ${res.status}`) };
        return onfulfilled ? onfulfilled(result) : (result as any);
      }

      const data = await res.json().catch(() => null);
      const result: SupabaseResponse = { data, error: null };
      return onfulfilled ? onfulfilled(result) : (result as any);
    } catch (err: any) {
      const result: SupabaseResponse = { data: null, error: err };
      return onfulfilled ? onfulfilled(result) : (result as any);
    }
  }
}

/** Where the client listens for 'online' and cross-tab 'storage' events (window in the browser). */
export interface AuthEventSource {
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

/** The part of navigator.locks we use. */
export interface RefreshLockManager {
  request<T>(name: string, options: { signal?: AbortSignal }, callback: () => Promise<T>): Promise<T>;
}

/** fetch that aborts after timeoutMs; the body is read under the same deadline. */
async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = AUTH_REQUEST_TIMEOUT_MS): Promise<{ res: Response; json: any }> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  (timer as any)?.unref?.();
  try {
    const res = await fetch(url, controller ? { ...init, signal: controller.signal } : init);
    const json = await res.json().catch(() => null);
    return { res, json };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

class LockWaitTimeout extends Error {}

export interface ClientOptions {
  /** Defaults to window when there is one. Pass null to listen to nothing. */
  events?: AuthEventSource | null;
  /** Defaults to navigator.locks when available. Pass null to run refreshes without a cross-tab lock. */
  locks?: RefreshLockManager | null;
}

export class ProductionSupabaseClient implements AccessTokenSource {
  public url: string;
  public apikey: string;
  public auth: {
    getSession: () => Promise<{ data: { session: StoredSession | null }; error: any }>;
    signInWithPassword: (creds: { email: string; password: string }) => Promise<{ data: any; error: any }>;
    refreshSession: () => Promise<{ data: { session: StoredSession | null }; error: any }>;
    signOut: () => Promise<{ error: any }>;
    onAuthStateChange: (cb: (event: AuthChangeEvent, session: StoredSession | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
  };

  private listeners = new Set<(event: AuthChangeEvent, session: StoredSession | null) => void>();
  private refreshing: Promise<StoredSession | null> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** Consecutive failed or repeated refreshes; drives the backoff. */
  private refreshStreak = 0;
  /** No network refresh before this (device ms). */
  private nextRefreshAt = 0;
  private lastRefreshOkAt = 0;
  /** A refresh failed for a temporary reason and is waiting to be retried. */
  private retryPending = false;
  /** The access token this tab last saw in storage, to spot other tabs' changes. */
  private knownToken: string | null = null;
  /**
   * Bumped on sign-in, sign-out and any cross-tab session change. A refresh
   * that started under an older generation is discarded, so a sign-out
   * during an in-flight refresh can't bring the session back.
   */
  private generation = 0;
  private events: AuthEventSource | null;
  private locks: RefreshLockManager | null;
  private beforeSignOut: ((accessToken: string) => unknown) | null = null;

  constructor(url: string, apikey: string, options: ClientOptions = {}) {
    this.url = url.replace(/\/+$/, '');
    this.apikey = apikey;
    this.knownToken = storedJwt();
    this.events =
      options.events !== undefined
        ? options.events
        : typeof window !== 'undefined' && typeof window.addEventListener === 'function'
          ? window
          : null;
    this.events?.addEventListener('online', this.onOnline);
    this.events?.addEventListener('storage', this.onStorage);
    const navLocks = (globalThis as any).navigator?.locks;
    this.locks =
      options.locks !== undefined ? options.locks : navLocks && typeof navLocks.request === 'function' ? navLocks : null;

    this.auth = {
      getSession: async () => {
        const saved = readStoredSession();
        // Only real Supabase sessions; the local-demo staff session is handled by auth.tsx.
        if (!saved || !isJwt(saved.access_token)) return { data: { session: null }, error: null };
        const token = await this.getAccessToken();
        const stored = readStoredSession();
        if (token) {
          if (stored && !this.retryPending) this.scheduleRefresh(stored);
          return { data: { session: stored }, error: null };
        }
        // Offline (or Supabase down) after expiry: stay signed in while the
        // refresh is retried. Requests still go out without the expired token
        // (they use getAccessToken), so this only keeps the UI signed in.
        if (this.retryPending && stored?.refresh_token && isJwt(stored.access_token)) {
          return { data: { session: stored }, error: null };
        }
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        try {
          const requestedAt = Date.now();
          const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              apikey: this.apikey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });
          const json = await res.json();
          if (!res.ok) {
            return { data: null, error: new Error(json.msg || json.error_description || 'Authentication failed') };
          }
          const session = normalizeSession(json, null, requestedAt);
          this.generation++;
          this.resetRefreshState();
          this.store(session);
          this.scheduleRefresh(session);
          this.emit('SIGNED_IN', session);
          return { data: session, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      refreshSession: async () => {
        const session = await this.refresh();
        return session
          ? { data: { session }, error: null }
          : { data: { session: null }, error: new Error('Session expired. Please sign in again.') };
      },
      signOut: async () => {
        const saved = readStoredSession();
        this.endSession();
        let token = saved && isJwt(saved.access_token) && !isSessionExpired(saved) ? saved.access_token : null;
        // Best effort, first: let our own proxy drop this token from its
        // session cache (setBeforeSignOut), so it stops accepting it now.
        if (token && this.beforeSignOut) await this.runBeforeSignOut(token);
        // Best effort: revoke the refresh token on the server too. /logout
        // needs a live access token, so swap the refresh token for one first
        // if ours has expired (the new session is used only to revoke).
        try {
          if (!token && saved && isJwt(saved.access_token) && saved.refresh_token) {
            const { res, json } = await fetchJsonWithTimeout(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
              method: 'POST',
              headers: { apikey: this.apikey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: saved.refresh_token }),
            });
            if (res.ok && isJwt(json?.access_token)) token = json.access_token;
          }
          if (token) {
            await fetchJsonWithTimeout(`${this.url}/auth/v1/logout`, {
              method: 'POST',
              headers: { apikey: this.apikey, Authorization: `Bearer ${token}` },
            });
          }
        } catch {}
        return { error: null };
      },
      onAuthStateChange: (cb) => {
        this.listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => void this.listeners.delete(cb) } } };
      },
    };
  }

  /**
   * Called with the access token at sign-out, before the Supabase revoke
   * (e.g. to tell our proxy to drop the token from its cache). Best effort:
   * errors are ignored and it gets at most 2 s.
   */
  setBeforeSignOut(hook: ((accessToken: string) => unknown) | null) {
    this.beforeSignOut = hook;
  }

  private async runBeforeSignOut(token: string) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve().then(() => this.beforeSignOut?.(token)),
        new Promise((resolve) => {
          timer = setTimeout(resolve, SIGN_OUT_HOOK_TIMEOUT_MS);
          (timer as any)?.unref?.();
        }),
      ]);
    } catch {
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Stop timers and event listeners (tests, hot reload). */
  dispose() {
    this.clearTimer();
    this.events?.removeEventListener('online', this.onOnline);
    this.events?.removeEventListener('storage', this.onStorage);
    this.listeners.clear();
  }

  private emit(event: AuthChangeEvent, session: StoredSession | null) {
    for (const cb of [...this.listeners]) {
      try {
        cb(event, session);
      } catch {}
    }
  }

  private store(session: StoredSession) {
    writeStoredSession(session);
    this.knownToken = session.access_token;
  }

  private clearTimer() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  private setTimer(delayMs: number) {
    this.clearTimer();
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, Math.min(Math.max(0, delayMs), 2 ** 31 - 1));
    (this.refreshTimer as any)?.unref?.();
  }

  private resetRefreshState() {
    this.refreshStreak = 0;
    this.nextRefreshAt = 0;
    this.lastRefreshOkAt = 0;
    this.retryPending = false;
  }

  /** Clear the stored session and tell listeners we're signed out. */
  private endSession() {
    this.generation++;
    this.clearTimer();
    this.resetRefreshState();
    clearStoredSession();
    this.knownToken = null;
    this.emit('SIGNED_OUT', null);
  }

  /** 5 s, then 5, 10, 20 … s for each further failed or repeated refresh, capped at 5 min. */
  private backoffMs(): number {
    return Math.min(MIN_REFRESH_DELAY_MS * 2 ** Math.max(0, this.refreshStreak - 1), MAX_REFRESH_BACKOFF_MS);
  }

  /**
   * Refresh refreshMarginMs before the local expiry, even if the tab is idle.
   * Never sooner than MIN_REFRESH_DELAY_MS or the current backoff.
   */
  private scheduleRefresh(session: StoredSession) {
    this.clearTimer();
    const exp = sessionExpiresAtLocal(session);
    if (!session.refresh_token || exp === null) return;
    const now = Date.now();
    this.setTimer(Math.max(MIN_REFRESH_DELAY_MS, this.nextRefreshAt - now, exp - refreshMarginMs(session) - now));
  }

  /** Back online: retry a refresh that failed for lack of network straight away. */
  private onOnline = () => {
    if (!this.retryPending) return;
    this.nextRefreshAt = 0;
    void this.refresh();
  };

  /**
   * Another tab wrote or removed ehi_auth_session (the 'storage' event only
   * fires in the other tabs). Follow its sign-out, sign-in or refresh.
   */
  private onStorage = (event: { key?: string | null }) => {
    if (event?.key !== SESSION_STORAGE_KEY && event?.key !== null) return;
    const next = readStoredSession();
    const nextToken = next && isJwt(next.access_token) ? next.access_token : null;
    if (nextToken === this.knownToken) return;
    const had = this.knownToken;
    this.knownToken = nextToken;
    this.generation++;
    if (!next || !nextToken) {
      this.clearTimer();
      this.resetRefreshState();
      if (had) this.emit('SIGNED_OUT', null);
      return;
    }
    // The other tab just refreshed (or signed in): don't refresh again straight away.
    this.refreshStreak = 0;
    this.retryPending = false;
    this.nextRefreshAt = Date.now() + MIN_REFRESH_DELAY_MS;
    this.scheduleRefresh(next);
    this.emit(had ? 'TOKEN_REFRESHED' : 'SIGNED_IN', next);
  };

  /**
   * Swap the refresh token for a new session via
   * /auth/v1/token?grant_type=refresh_token. One refresh at a time per tab
   * (shared promise) and across tabs (navigator.locks 'ehi_auth_refresh';
   * Supabase rotates refresh tokens, so parallel refreshes would race), and
   * never more often than the backoff allows. Signs out only when Supabase
   * definitively rejects the refresh token (isRefreshRejected) and no other
   * tab has stored a newer one. On a network error, 5xx or anything else
   * temporary the session is kept and retried with backoff (and on the
   * 'online' event); an expired access token is still never sent.
   */
  private refresh(): Promise<StoredSession | null> {
    if (this.refreshing) return this.refreshing;
    if (Date.now() < this.nextRefreshAt) {
      // Too soon after the last attempt: no network call. Make sure a retry is queued.
      const current = readStoredSession();
      if (current?.refresh_token && !this.refreshTimer) this.setTimer(this.nextRefreshAt - Date.now());
      return Promise.resolve(current && isJwt(current.access_token) && !isSessionExpired(current) ? current : null);
    }
    const before = readStoredSession();
    this.refreshing = this.withRefreshLock(() => this.refreshLocked(before))
      .catch(() => {
        // Lock wait timed out, or something unexpected threw: never sign out
        // for that; keep the session and retry with backoff.
        const current = readStoredSession();
        return current?.refresh_token ? this.refreshFailed(current) : this.discarded();
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  /**
   * Run fn under the cross-tab refresh lock, or directly when locks are
   * unavailable. The lock is held only while fn runs, and fn always settles
   * (its requests time out after AUTH_REQUEST_TIMEOUT_MS), so the lock is
   * always released. Waiting for the lock gives up after REFRESH_LOCK_WAIT_MS
   * (e.g. a tab frozen while holding it).
   */
  private withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.locks) return fn();
    let started = false;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const waitTimer = controller ? setTimeout(() => controller.abort(), REFRESH_LOCK_WAIT_MS) : null;
    (waitTimer as any)?.unref?.();
    const run = () => {
      started = true;
      if (waitTimer) clearTimeout(waitTimer);
      return fn();
    };
    let granted: Promise<T>;
    try {
      granted = this.locks.request(REFRESH_LOCK_NAME, controller ? { signal: controller.signal } : {}, run);
    } catch {
      if (waitTimer) clearTimeout(waitTimer);
      return fn();
    }
    return granted.catch((err) => {
      if (waitTimer) clearTimeout(waitTimer);
      if (started) throw err;
      throw new LockWaitTimeout('Timed out waiting for the refresh lock');
    });
  }

  private async refreshLocked(before: StoredSession | null): Promise<StoredSession | null> {
    const generation = this.generation;
    // Re-read inside the lock: another tab may have refreshed while we waited.
    const current = readStoredSession();
    if (
      current &&
      isJwt(current.access_token) &&
      current.access_token !== before?.access_token &&
      !isSessionExpired(current, refreshMarginMs(current))
    ) {
      return this.adopt(current);
    }
    if (!current?.refresh_token) {
      if (current && isJwt(current.access_token)) this.endSession();
      return null;
    }
    const sentRefreshToken = current.refresh_token;
    // The result belongs to a session that is gone (signed out, signed in
    // again, or changed by another tab) if either of these changed meanwhile.
    const stale = () => this.generation !== generation || readStoredSession()?.refresh_token !== sentRefreshToken;
    const requestedAt = Date.now();
    let res: Response;
    let json: any = null;
    try {
      // Aborted after AUTH_REQUEST_TIMEOUT_MS: a hung request counts as a
      // network error (kept session, backoff) and releases the lock.
      ({ res, json } = await fetchJsonWithTimeout(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: this.apikey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: sentRefreshToken }),
      }));
    } catch {
      return stale() ? this.discarded() : this.refreshFailed(current);
    }
    if (res.ok && isJwt(json?.access_token)) {
      if (stale()) return this.discarded();
      const session = normalizeSession(json, current, requestedAt);
      const now = Date.now();
      // A refresh right after another one means something keeps rejecting
      // fresh tokens: back off instead of looping.
      const lifetimeMs = (session.expires_in ?? FALLBACK_TOKEN_LIFETIME_SECONDS) * 1000;
      const repeatWindow = Math.min(REPEATED_REFRESH_WINDOW_MS, lifetimeMs / 4);
      this.refreshStreak = this.lastRefreshOkAt && now - this.lastRefreshOkAt < repeatWindow ? this.refreshStreak + 1 : 0;
      this.lastRefreshOkAt = now;
      this.nextRefreshAt = now + this.backoffMs();
      this.retryPending = false;
      this.store(session);
      this.scheduleRefresh(session);
      this.emit('TOKEN_REFRESHED', session);
      return session;
    }
    if (isRefreshRejected(res.status, json)) {
      // Rejected because another tab already rotated it? Then adopt that tab's session.
      const latest = readStoredSession();
      if (latest?.refresh_token && latest.refresh_token !== sentRefreshToken && isJwt(latest.access_token)) {
        return this.adopt(latest);
      }
      if (this.generation !== generation) return this.discarded();
      this.endSession();
      return null;
    }
    return stale() ? this.discarded() : this.refreshFailed(current);
  }

  /** Take over a session another tab stored (no network call). */
  private adopt(session: StoredSession): StoredSession | null {
    const changed = session.access_token !== this.knownToken;
    this.knownToken = session.access_token;
    this.refreshStreak = 0;
    this.retryPending = false;
    this.nextRefreshAt = Date.now() + MIN_REFRESH_DELAY_MS;
    this.scheduleRefresh(session);
    if (changed) this.emit('TOKEN_REFRESHED', session);
    return isSessionExpired(session) ? null : session;
  }

  /** The refresh result is for a session that no longer exists: drop it, report what is stored now. */
  private discarded(): StoredSession | null {
    const now = readStoredSession();
    return now && isJwt(now.access_token) && !isSessionExpired(now) ? now : null;
  }

  /** Temporary failure: keep the session, retry after the backoff (or when back online). */
  private refreshFailed(current: StoredSession): StoredSession | null {
    this.refreshStreak++;
    const delay = this.backoffMs();
    this.nextRefreshAt = Date.now() + delay;
    this.retryPending = true;
    this.setTimer(delay);
    const latest = readStoredSession() ?? current;
    return isJwt(latest.access_token) && !isSessionExpired(latest) ? latest : null;
  }

  /**
   * A valid access token for table requests, or null (signed out, or the
   * token has expired and could not be refreshed yet). Refreshes first when
   * the token is within refreshMarginMs of its local expiry. An expired token
   * with no refresh token ends the session; an expired token is never sent.
   */
  async getAccessToken(): Promise<string | null> {
    const saved = readStoredSession();
    if (!saved || !isJwt(saved.access_token)) return null;
    if (!isSessionExpired(saved, refreshMarginMs(saved))) return saved.access_token;
    if (saved.refresh_token) {
      const fresh = await this.refresh();
      return fresh && !isSessionExpired(fresh) ? fresh.access_token : null;
    }
    if (isSessionExpired(saved)) {
      this.endSession();
      return null;
    }
    return saved.access_token;
  }

  /** Called after a 401: refresh (unless another request or tab already did) and return the new token. */
  async refreshAfterUnauthorized(rejectedToken: string): Promise<string | null> {
    const saved = readStoredSession();
    if (saved && isJwt(saved.access_token) && saved.access_token !== rejectedToken && !isSessionExpired(saved)) {
      return saved.access_token;
    }
    if (!saved?.refresh_token) {
      if (saved && isJwt(saved.access_token)) this.endSession();
      return null;
    }
    const fresh = await this.refresh();
    return fresh && fresh.access_token !== rejectedToken ? fresh.access_token : null;
  }

  from(table: string): PostgrestQueryBuilder {
    return new PostgrestQueryBuilder(this.url, this.apikey, table, this);
  }

  channel(name: string) {
    const ch: any = {
      on: (_event: any, _opts: any, _cb?: any) => ch,
      subscribe: () => ({
        unsubscribe: () => {},
      }),
    };
    return ch;
  }

  removeChannel(_channel: any) {}
}

const envUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';
const envKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';

const userStoredUrl =
  typeof window !== 'undefined' && typeof localStorage !== 'undefined'
    ? localStorage.getItem('supabase_url') || ''
    : '';
const userStoredKey =
  typeof window !== 'undefined' && typeof localStorage !== 'undefined'
    ? localStorage.getItem('supabase_anon_key') || ''
    : '';

export const SUPABASE_CONFIG = {
  url: envUrl || userStoredUrl,
  key: envKey || userStoredKey,
};

export const isConfigured: boolean = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.key);
export const isDemoMode: boolean = !isConfigured;

export const supabase = isConfigured
  ? new ProductionSupabaseClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key)
  : null;

export type SupabaseClient = ProductionSupabaseClient;
