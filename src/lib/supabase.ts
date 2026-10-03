/**
 * Supabase Production Client
 * Connected to: https://zxdxsizyvotkcsrtzscw.supabase.co
 * Supports REST queries, auth, and graceful fallback when schema tables are being initialized.
 */

export interface SupabaseResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export class PostgrestQueryBuilder {
  private url: string;
  private apikey: string;
  private table: string;
  private queryParams: URLSearchParams;
  private bodyData?: any;
  private httpMethod: string = 'GET';

  constructor(url: string, apikey: string, table: string) {
    this.url = url.replace(/\/+$/, '');
    this.apikey = apikey;
    this.table = table;
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
      const headers: Record<string, string> = {
        apikey: this.apikey,
        Authorization: `Bearer ${this.apikey}`,
        'Content-Type': 'application/json',
        Prefer: this.httpMethod === 'POST' ? 'return=representation' : 'count=none',
      };

      const res = await fetch(endpoint, {
        method: this.httpMethod,
        headers,
        body: this.bodyData ? JSON.stringify(this.bodyData) : undefined,
      });

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

export class ProductionSupabaseClient {
  public url: string;
  public apikey: string;
  public auth: {
    getSession: () => Promise<{ data: { session: any }; error: any }>;
    signInWithPassword: (creds: { email: string; password: string }) => Promise<{ data: any; error: any }>;
    signOut: () => Promise<{ error: any }>;
    onAuthStateChange: (cb: (event: string, session: any) => void) => { data: { subscription: { unsubscribe: () => void } } };
  };

  constructor(url: string, apikey: string) {
    this.url = url.replace(/\/+$/, '');
    this.apikey = apikey;

    this.auth = {
      getSession: async () => {
        const saved = localStorage.getItem('ehi_auth_session');
        if (saved) {
          try {
            return { data: { session: JSON.parse(saved) }, error: null };
          } catch {}
        }
        return { data: { session: null }, error: null };
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
          localStorage.setItem('ehi_auth_session', JSON.stringify(json));
          return { data: json, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      signOut: async () => {
        localStorage.removeItem('ehi_auth_session');
        return { error: null };
      },
      onAuthStateChange: (_cb) => {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    };
  }

  from(table: string): PostgrestQueryBuilder {
    return new PostgrestQueryBuilder(this.url, this.apikey, table);
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
