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

/** Refresh this many seconds before the access token expires. */
export const REFRESH_MARGIN_SECONDS = 60;

/** A Supabase session as returned by /auth/v1/token, plus a computed expires_at. */
export interface StoredSession {
  access_token: string;
  refresh_token?: string;
  /** Unix seconds. */
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: any;
  [key: string]: any;
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

const nowSeconds = () => Math.floor(Date.now() / 1000);

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

/** When the session's access token expires (unix seconds), or null if unknown. */
export function sessionExpiresAt(session: StoredSession | null | undefined): number | null {
  if (!session || typeof session.access_token !== 'string') return null;
  const exp = jwtPayload(session.access_token)?.exp;
  if (typeof exp === 'number') return exp;
  return typeof session.expires_at === 'number' ? session.expires_at : null;
}

/**
 * True if the token expires within marginSeconds. A token with no known
 * expiry counts as expired, so we never send a token we can't vouch for.
 */
export function isSessionExpired(session: StoredSession | null | undefined, marginSeconds = 0, now = nowSeconds()): boolean {
  const exp = sessionExpiresAt(session);
  return exp === null || exp - marginSeconds <= now;
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

function clearStoredSession(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_STORAGE_KEY);
}

/** Supabase token-endpoint JSON -> the session we store (keeps refresh_token, adds expires_at). */
function normalizeSession(json: any, previous?: StoredSession | null): StoredSession {
  const session: StoredSession = { ...json };
  if (!session.user && previous?.user) session.user = previous.user;
  const fromJwt = sessionExpiresAt({ access_token: session.access_token });
  if (fromJwt !== null) session.expires_at = fromJwt;
  else if (typeof json.expires_at !== 'number' && typeof json.expires_in === 'number') {
    session.expires_at = nowSeconds() + json.expires_in;
  }
  return session;
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

  constructor(url: string, apikey: string) {
    this.url = url.replace(/\/+$/, '');
    this.apikey = apikey;

    this.auth = {
      getSession: async () => {
        const saved = readStoredSession();
        // Only real Supabase sessions; the local-demo staff session is handled by auth.tsx.
        if (!saved || !isJwt(saved.access_token)) return { data: { session: null }, error: null };
        const token = await this.getAccessToken();
        const session = token ? readStoredSession() : null;
        if (session) this.scheduleRefresh(session);
        return { data: { session }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        try {
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
          const session = normalizeSession(json);
          writeStoredSession(session);
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
        // Best effort: revoke the refresh token on the server too.
        if (saved && isJwt(saved.access_token) && !isSessionExpired(saved)) {
          try {
            await fetch(`${this.url}/auth/v1/logout`, {
              method: 'POST',
              headers: { apikey: this.apikey, Authorization: `Bearer ${saved.access_token}` },
            });
          } catch {}
        }
        return { error: null };
      },
      onAuthStateChange: (cb) => {
        this.listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => void this.listeners.delete(cb) } } };
      },
    };
  }

  private emit(event: AuthChangeEvent, session: StoredSession | null) {
    for (const cb of [...this.listeners]) {
      try {
        cb(event, session);
      } catch {}
    }
  }

  /** Clear the stored session and tell listeners we're signed out. */
  private endSession() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    clearStoredSession();
    this.emit('SIGNED_OUT', null);
  }

  /** Refresh REFRESH_MARGIN_SECONDS before expiry, even if the tab is idle. */
  private scheduleRefresh(session: StoredSession) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    const exp = sessionExpiresAt(session);
    if (!session.refresh_token || exp === null) return;
    const delayMs = Math.min(Math.max(0, (exp - REFRESH_MARGIN_SECONDS) * 1000 - Date.now()), 2 ** 31 - 1);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, delayMs);
    (this.refreshTimer as any)?.unref?.();
  }

  /**
   * Swap the refresh token for a new session via
   * /auth/v1/token?grant_type=refresh_token. One refresh at a time (Supabase
   * rotates refresh tokens, so parallel refreshes would race). If Supabase
   * rejects it, or we can't reach it and the access token has expired, we
   * sign out.
   */
  private refresh(): Promise<StoredSession | null> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      const current = readStoredSession();
      if (!current?.refresh_token) {
        if (current && isJwt(current.access_token)) this.endSession();
        return null;
      }
      let res: Response;
      try {
        res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: this.apikey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: current.refresh_token }),
        });
      } catch {
        // Offline: keep a still-valid token and retry later, otherwise sign out.
        if (!isSessionExpired(current)) {
          this.scheduleRetry();
          return current;
        }
        this.endSession();
        return null;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !isJwt(json?.access_token)) {
        this.endSession();
        return null;
      }
      const session = normalizeSession(json, current);
      if (isSessionExpired(session)) {
        this.endSession();
        return null;
      }
      writeStoredSession(session);
      this.scheduleRefresh(session);
      this.emit('TOKEN_REFRESHED', session);
      return session;
    })().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private scheduleRetry() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 15_000);
    (this.refreshTimer as any)?.unref?.();
  }

  /**
   * A valid access token for table requests, or null (signed out). Refreshes
   * first when the token is within REFRESH_MARGIN_SECONDS of expiry. An
   * expired token with no refresh token ends the session; it is never sent.
   */
  async getAccessToken(): Promise<string | null> {
    const saved = readStoredSession();
    if (!saved || !isJwt(saved.access_token)) return null;
    if (!isSessionExpired(saved, REFRESH_MARGIN_SECONDS)) return saved.access_token;
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

  /** Called after a 401: refresh (unless another request already did) and return the new token. */
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
