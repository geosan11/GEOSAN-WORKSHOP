import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLIENT_PROJECTS, CLIENT_PROJECT_IDS, CLIENT_PROJECT_BUDGETS } from './clientProjects';
import { LEGACY_PROJECT_ID_MAP } from '../lib/projectIdMigration';
import { DEFAULT_WORKSPACE_ID } from '../lib/workspace';

test('one record per canonical id, no old ids, neutral workspace', () => {
  const ids = CLIENT_PROJECTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), Object.values(CLIENT_PROJECT_IDS).sort());
  for (const p of CLIENT_PROJECTS) {
    assert.ok(!(p.id in LEGACY_PROJECT_ID_MAP), `${p.id} is an old id`);
    assert.equal(p.org_id, DEFAULT_WORKSPACE_ID);
    assert.match(p.design_kit ?? '', /^[a-z0-9-]+$/, `${p.id} has no design kit`);
  }
  assert.deepEqual(CLIENT_PROJECT_BUDGETS.map((b) => b.project_id), ids);
});

test('supabase/schema.sql seeds the same ids and design kits', () => {
  const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
  const seed = sql.slice(sql.indexOf('insert into public.project_registry'));
  const rows = [...seed.matchAll(/^\s*\('(proj-[^']+)',.*'([a-z0-9-]+)'\),?\s*$/gm)].map((m) => [m[1], m[2]]);
  assert.deepEqual(
    rows.sort(),
    CLIENT_PROJECTS.map((p) => [p.id, p.design_kit!]).sort()
  );
  assert.ok(!sql.includes('org-ehi-global'), 'schema.sql still uses org-ehi-global');
});
