import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGitHubProxyRequest, isLoopback, isOriginAllowed } from './githubProxyPolicy.mjs';

const env = { GITHUB_TOKEN: 'server-token' };
const SHA = 'a'.repeat(40);
const check = (endpoint, options) => checkGitHubProxyRequest(endpoint, options, env);
const status = (endpoint, options) => {
  const r = check(endpoint, options);
  return r.ok ? 200 : r.status;
};

test('allows exactly the calls GitHubClient makes', () => {
  assert.equal(status('/repos/o/r'), 200);
  assert.equal(status('/repos/o/r/commits?sha=main&per_page=1'), 200);
  assert.equal(status(`/repos/o/r/git/trees/${SHA}?recursive=1`), 200);
  assert.equal(status(`/repos/o/r/git/blobs/${SHA}`), 200);
  assert.equal(status(`/repos/o/r/git/commits/${SHA}`), 200);
  assert.equal(status('/repos/o/r/git/refs/heads/main'), 200);
  assert.equal(status('/repos/o/r/git/blobs', { method: 'POST', body: '{"content":"x"}' }), 200);
  assert.equal(status('/repos/o/r/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: SHA, force: false }) }), 200);
});

test('refuses everything else', () => {
  assert.equal(status('/repos/o/r', { method: 'DELETE' }), 403);
  assert.equal(status('/repos/o/r/pulls', { method: 'POST', body: '{}' }), 403);
  assert.equal(status('/repos/o/r/actions/secrets'), 403);
  assert.equal(status('/repos/o/r/collaborators'), 403);
  assert.equal(status('/user/repos'), 403);
  assert.equal(status('/repos/o/r/commits?per_page=1&access_token=x'), 403);
  assert.equal(status('/repos/o/r/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: SHA, force: true }) }), 403);
  assert.equal(status('/repos/o/r/../../user'), 400);
});

test('client cannot override Authorization; body string is not re-encoded', () => {
  const r = check('/repos/o/r/git/blobs', { method: 'POST', body: '{"content":"x"}', headers: { Authorization: 'token stolen' } });
  assert.equal(r.headers.Authorization, 'token server-token');
  assert.equal(r.body, '{"content":"x"}');
});

test('missing token is 503, not a placeholder', () => {
  assert.equal(checkGitHubProxyRequest('/repos/o/r', {}, {}).status, 503);
});

test('loopback and origin checks', () => {
  assert.ok(isLoopback('127.0.0.1') && isLoopback('::1') && isLoopback('::ffff:127.0.0.1'));
  assert.ok(!isLoopback('192.168.1.20'));
  assert.ok(isOriginAllowed('http://localhost:3000', {}));
  assert.ok(!isOriginAllowed('https://evil.example.com', {}));
});
