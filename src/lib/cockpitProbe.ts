import { proxyAuthHeaders, proxyUrl } from './proxyAuth';

export interface ShouldProbeProxyInput {
  isDev?: boolean;
  proxyUrlConfigured?: boolean;
  hostname?: string | null;
}

/**
 * Returns true only if isDev, OR proxyUrlConfigured, OR hostname is localhost/127.0.0.1/::1.
 * Otherwise false (the deployed Vercel site never probes).
 */
export function shouldProbeProxy(input?: ShouldProbeProxyInput): boolean {
  if (!input) return false;
  const { isDev = false, proxyUrlConfigured = false, hostname = '' } = input;
  if (Boolean(isDev)) return true;
  if (Boolean(proxyUrlConfigured)) return true;

  const host = (hostname || '').toLowerCase().trim();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return true;
  }

  return false;
}

export interface CommitSummary {
  sha7: string;
  message: string;
  date: string;
}

export type ProbeResult =
  | { state: 'reachable'; latestCommit: CommitSummary }
  | { state: 'refused'; status: number }
  | { state: 'unreachable' }
  | { state: 'disabled' };

export interface ProbeProxyInput {
  repo: string | null | undefined;
  projectId?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  url?: string;
}

/**
 * ONE POST to `url` (defaults to proxyUrl('/api/github/proxy')).
 * Headers: Content-Type json plus proxyAuthHeaders().
 * Body: { endpoint: `/repos/${repo}/commits?per_page=1`, project_id: projectId, options: { method: 'GET' } }.
 * Uses an AbortController timeout of timeoutMs.
 * Never throws.
 */
export async function probeProxy({
  repo,
  projectId = null,
  fetchImpl = fetch,
  timeoutMs = 1500,
  url = proxyUrl('/api/github/proxy'),
}: ProbeProxyInput): Promise<ProbeResult> {
  if (!repo) {
    return { state: 'disabled' };
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<ProbeResult>((resolve) => {
    timer = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
      resolve({ state: 'unreachable' });
    }, timeoutMs);
  });

  const fetchPromise = (async (): Promise<ProbeResult> => {
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...proxyAuthHeaders(),
        },
        body: JSON.stringify({
          endpoint: `/repos/${repo}/commits?per_page=1`,
          project_id: projectId ?? null,
          options: { method: 'GET' },
        }),
        signal: controller.signal,
      });

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { state: 'refused', status: res.status };
      }

      if (res.status < 200 || res.status >= 300) {
        return { state: 'unreachable' };
      }

      const body = await res.json().catch(() => null);
      if (!Array.isArray(body) || body.length === 0 || !body[0] || typeof body[0] !== 'object') {
        return { state: 'unreachable' };
      }

      const first = body[0] as Record<string, unknown>;
      const rawSha = typeof first.sha === 'string' ? first.sha : '';
      const sha7 = rawSha.slice(0, 7);

      const commitObj =
        first.commit && typeof first.commit === 'object'
          ? (first.commit as Record<string, unknown>)
          : null;
      const rawMsg = (commitObj?.message ?? first.message ?? '').toString();
      const firstLine = rawMsg.split(/\r?\n/)[0] ?? '';
      const message = firstLine.slice(0, 72);

      const authorObj =
        commitObj?.author && typeof commitObj.author === 'object'
          ? (commitObj.author as Record<string, unknown>)
          : null;
      const committerObj =
        commitObj?.committer && typeof commitObj.committer === 'object'
          ? (commitObj.committer as Record<string, unknown>)
          : null;
      const date = (authorObj?.date ?? committerObj?.date ?? first.date ?? '').toString();

      return {
        state: 'reachable',
        latestCommit: { sha7, message, date },
      };
    } catch {
      return { state: 'unreachable' };
    }
  })();

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
