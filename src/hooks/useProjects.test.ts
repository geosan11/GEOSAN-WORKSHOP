import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectsFromStorage, findStoredProject } from './useProjects';

test('no built-in projects: nothing saved gives an empty list', () => {
  assert.deepEqual(projectsFromStorage(null).projects, []);
});

test('a broken saved project list gives an empty list (no placeholder seed)', () => {
  for (const broken of ['{not json', '"a string"', '{"id":"x"}', 'null']) {
    assert.deepEqual(projectsFromStorage(broken).projects, [], `for ${broken}`);
  }
});

test('a valid saved list is kept, including an empty one; entries without a string id are skipped', () => {
  assert.deepEqual(projectsFromStorage('[]').projects, []);
  const list = projectsFromStorage(JSON.stringify([{ id: 'proj-x', name: 'X' }, null, 5, { name: 'no id' }])).projects;
  assert.deepEqual(list.map((p) => p.id), ['proj-x']);
});

test('findStoredProject: unknown id or empty store gives null', () => {
  assert.equal(findStoredProject('proj-ehi-001', null), null);
  assert.equal(findStoredProject('proj-x', '[]'), null);
  assert.equal(findStoredProject('proj-x', JSON.stringify([{ id: 'proj-x', name: 'X' }]))?.name, 'X');
});
