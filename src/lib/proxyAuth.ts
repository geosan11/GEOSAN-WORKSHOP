/**
 * Headers for calls to our own backend proxies. The proxy only accepts
 * signed-in callers, so we forward the current Supabase session token.
 */
export function proxyAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('ehi_auth_session');
    const token = saved ? JSON.parse(saved)?.access_token : undefined;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const DEFAULT_PROXY_PORT = 3001;

/**
 * Base URL of the backend proxy (server.js). Set VITE_PROXY_URL to override,
 * e.g. VITE_PROXY_URL=https://proxy.example.com. Otherwise we use the host
 * the app was opened on with port 3001, so opening the app at 127.0.0.1:3000
 * calls 127.0.0.1:3001 (and its Origin matches the proxy allowlist) instead
 * of a hardcoded localhost.
 */
export function proxyBaseUrl(): string {
  const configured = (import.meta.env?.VITE_PROXY_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window === 'undefined') return `http://localhost:${DEFAULT_PROXY_PORT}`;
  return `http://${window.location.hostname}:${DEFAULT_PROXY_PORT}`;
}

/** Absolute URL for a proxy path such as '/api/ai/chat'. */
export function proxyUrl(path: string): string {
  return `${proxyBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
