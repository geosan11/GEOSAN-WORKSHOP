import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldProbeProxy, probeProxy } from './cockpitProbe';

// ----------------------------------------------------------------------------
// shouldProbeProxy Truth Table Tests
// ----------------------------------------------------------------------------
test('shouldProbeProxy: returns true for isDev=true regardless of host/proxyUrl', () => {
  assert.equal(shouldProbeProxy({ isDev: true }), true);
  assert.equal(shouldProbeProxy({ isDev: true, hostname: 'vercel.app' }), true);
  assert.equal(shouldProbeProxy({ isDev: true, proxyUrlConfigured: false, hostname: 'remote.io' }), true);
});

test('shouldProbeProxy: returns true when proxyUrlConfigured=true regardless of isDev/hostname', () => {
  assert.equal(shouldProbeProxy({ proxyUrlConfigured: true }), true);
  assert.equal(shouldProbeProxy({ isDev: false, proxyUrlConfigured: true, hostname: 'geosan.vercel.app' }), true);
});

test('shouldProbeProxy: returns true for loopback hostnames (localhost, 127.0.0.1, ::1, [::1])', () => {
  assert.equal(shouldProbeProxy({ hostname: 'localhost' }), true);
  assert.equal(shouldProbeProxy({ hostname: '127.0.0.1' }), true);
  assert.equal(shouldProbeProxy({ hostname: '::1' }), true);
  assert.equal(shouldProbeProxy({ hostname: '[::1]' }), true);
  assert.equal(shouldProbeProxy({ isDev: false, proxyUrlConfigured: false, hostname: 'LOCALHOST' }), true);
});

test('shouldProbeProxy: returns false on deployed non-loopback domains without dev/proxyUrl', () => {
  assert.equal(shouldProbeProxy({ isDev: false, proxyUrlConfigured: false, hostname: 'geosan-cockpit.vercel.app' }), false);
  assert.equal(shouldProbeProxy({ isDev: false, proxyUrlConfigured: false, hostname: 'app.geosan.ai' }), false);
  assert.equal(shouldProbeProxy({ isDev: false, proxyUrlConfigured: false, hostname: '' }), false);
  assert.equal(shouldProbeProxy(), false);
  assert.equal(shouldProbeProxy({}), false);
});

// ----------------------------------------------------------------------------
// probeProxy Tests
// ----------------------------------------------------------------------------
test('probeProxy: repo=null returns disabled without invoking fetch', async () => {
  let fetchCalled = false;
  const fakeFetch = (async () => {
    fetchCalled = true;
    return new Response('[]');
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: null,
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'disabled');
  assert.equal(fetchCalled, false);
});

test('probeProxy: 200 array returns reachable with latest commit (sha7, message max 72, date)', async () => {
  const commitData = [
    {
      sha: 'a1b2c3d4e5f67890123456789abcdef012345678',
      commit: {
        message: 'feat: add cockpit status row tiles\n\nExtended commit body with additional info',
        author: {
          date: '2026-11-04T18:30:00Z',
        },
      },
    },
  ];

  const fakeFetch = (async () => {
    return new Response(JSON.stringify(commitData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'reachable');
  if (result.state === 'reachable') {
    assert.equal(result.latestCommit.sha7, 'a1b2c3d');
    assert.equal(result.latestCommit.message, 'feat: add cockpit status row tiles');
    assert.equal(result.latestCommit.date, '2026-11-04T18:30:00Z');
  }
});

test('probeProxy: commit message truncates first line to 72 chars', async () => {
  const longFirstLine = 'feat: a very long commit message that definitely exceeds seventy-two characters in length and should be truncated';
  const commitData = [
    {
      sha: '1234567890abcdef',
      commit: {
        message: `${longFirstLine}\n\nbody here`,
        author: { date: '2026-11-04T12:00:00Z' },
      },
    },
  ];

  const fakeFetch = (async () => {
    return new Response(JSON.stringify(commitData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'reachable');
  if (result.state === 'reachable') {
    assert.equal(result.latestCommit.message.length, 72);
    assert.equal(result.latestCommit.message, longFirstLine.slice(0, 72));
  }
});

test('probeProxy: request body, headers, and endpoint shape are exactly as specified', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = url.toString();
    capturedInit = init;
    return new Response(
      JSON.stringify([
        {
          sha: 'abcdef1234567',
          commit: { message: 'initial commit', author: { date: '2026-11-04T10:00:00Z' } },
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as unknown as typeof fetch;

  const targetUrl = 'http://127.0.0.1:3001/api/github/proxy';
  await probeProxy({
    repo: 'owner/test-repo',
    projectId: 'proj-42',
    url: targetUrl,
    fetchImpl: fakeFetch,
  });

  assert.equal(capturedUrl, targetUrl);
  assert.equal(capturedInit?.method, 'POST');
  assert.equal(
    (capturedInit?.headers as Record<string, string>)?.['Content-Type'],
    'application/json'
  );

  const parsedBody = JSON.parse(capturedInit?.body as string);
  assert.deepEqual(parsedBody, {
    endpoint: '/repos/owner/test-repo/commits?per_page=1',
    project_id: 'proj-42',
    options: { method: 'GET' },
  });
});

test('probeProxy: 401 returns refused with status 401', async () => {
  const fakeFetch = (async () => {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'refused');
  if (result.state === 'refused') {
    assert.equal(result.status, 401);
  }
});

test('probeProxy: 403 returns refused with status 403', async () => {
  const fakeFetch = (async () => {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'refused');
  if (result.state === 'refused') {
    assert.equal(result.status, 403);
  }
});

test('probeProxy: 500 returns unreachable', async () => {
  const fakeFetch = (async () => {
    return new Response('Internal Server Error', { status: 500 });
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'unreachable');
});

test('probeProxy: non-array response body returns unreachable', async () => {
  const fakeFetch = (async () => {
    return new Response(JSON.stringify({ message: 'Not Found' }), { status: 200 });
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'unreachable');
});

test('probeProxy: thrown network error returns unreachable without throwing', async () => {
  const fakeFetch = (async () => {
    throw new Error('ECONNREFUSED 127.0.0.1:3001');
  }) as unknown as typeof fetch;

  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.state, 'unreachable');
});

test('probeProxy: hung fetch with timeoutMs=50 resolves unreachable quickly', async () => {
  const hungFetch = (async () => {
    // Hanging promise that never resolves
    return new Promise<Response>(() => {});
  }) as unknown as typeof fetch;

  const startTime = Date.now();
  const result = await probeProxy({
    repo: 'geosan11/workshop',
    fetchImpl: hungFetch,
    timeoutMs: 50,
  });
  const duration = Date.now() - startTime;

  assert.equal(result.state, 'unreachable');
  assert.ok(duration < 250, `Expected hung fetch to resolve in <250ms, took ${duration}ms`);
});
