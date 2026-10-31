import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WORKSPACE_ID, LEGACY_WORKSPACE_IDS, normalizeWorkspaceId } from './workspace';
import { toAuthUser } from './authPolicy';

test('LEGACY_WORKSPACE_IDS contains org-ehi-global and org-geosan', () => {
  assert.deepEqual([...LEGACY_WORKSPACE_IDS], ['org-ehi-global', 'org-geosan']);
  assert.equal(DEFAULT_WORKSPACE_ID, 'org-geosan-workshop');
});

test('normalizeWorkspaceId maps legacy, empty, and non-string values to DEFAULT_WORKSPACE_ID and keeps other strings', () => {
  assert.equal(normalizeWorkspaceId('org-ehi-global'), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId('org-geosan'), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId(''), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId(undefined), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId(null), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId(123), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId({}), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId([]), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId(false), DEFAULT_WORKSPACE_ID);

  assert.equal(normalizeWorkspaceId(DEFAULT_WORKSPACE_ID), DEFAULT_WORKSPACE_ID);
  assert.equal(normalizeWorkspaceId('org-custom-workspace'), 'org-custom-workspace');
});

test('toAuthUser derives normalized org_id from legacy or missing user_metadata', () => {
  const fromEhi = toAuthUser({
    id: 'u-1',
    email: 'owner@example.com',
    user_metadata: { org_id: 'org-ehi-global', org_role: 'owner' },
  });
  assert.equal(fromEhi.user_metadata.org_id, DEFAULT_WORKSPACE_ID);

  const fromGeosan = toAuthUser({
    id: 'u-2',
    email: 'owner@example.com',
    user_metadata: { org_id: 'org-geosan', org_role: 'owner' },
  });
  assert.equal(fromGeosan.user_metadata.org_id, DEFAULT_WORKSPACE_ID);

  const fromMissing = toAuthUser({
    id: 'u-3',
    email: 'owner@example.com',
    user_metadata: {},
  });
  assert.equal(fromMissing.user_metadata.org_id, DEFAULT_WORKSPACE_ID);

  const fromCurrent = toAuthUser({
    id: 'u-4',
    email: 'owner@example.com',
    user_metadata: { org_id: DEFAULT_WORKSPACE_ID },
  });
  assert.equal(fromCurrent.user_metadata.org_id, DEFAULT_WORKSPACE_ID);

  const fromOther = toAuthUser({
    id: 'u-5',
    email: 'owner@example.com',
    user_metadata: { org_id: 'org-custom-99' },
  });
  assert.equal(fromOther.user_metadata.org_id, 'org-custom-99');
});
