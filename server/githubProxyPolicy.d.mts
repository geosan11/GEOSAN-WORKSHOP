export interface ProxyOk {
  ok: true;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}
export interface ProxyRejected {
  ok: false;
  status: number;
  error: string;
}
export function allowedOrigins(env?: Record<string, string | undefined>): string[];
export function isLoopback(address: string | undefined | null): boolean;
export function isOriginAllowed(origin: string | undefined | null, env?: Record<string, string | undefined>): boolean;
export function checkGitHubProxyRequest(
  endpoint: unknown,
  options?: { method?: string; headers?: Record<string, unknown>; body?: unknown },
  env?: Record<string, string | undefined>
): ProxyOk | ProxyRejected;
