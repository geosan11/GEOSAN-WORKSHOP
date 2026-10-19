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
