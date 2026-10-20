import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectsFromStorage } from './useProjects';
import { CLIENT_PROJECTS } from '../data/clientProjects';

const seedIds = CLIENT_PROJECTS.map((p) => p.id);

test('a broken saved project list falls back to the seed projects, not an empty list', () => {
  for (const broken of ['{not json', '"a string"', '{"id":"x"}', 'null']) {
    const { projects } = projectsFromStorage(broken);
    assert.deepEqual(projects.map((p) => p.id), seedIds, `for ${broken}`);
  }
});

test('nothing saved yet: the seed projects', () => {
  assert.deepEqual(projectsFromStorage(null).projects.map((p) => p.id), seedIds);
});

test('a valid saved list is kept as is, including an empty one', () => {
  assert.deepEqual(projectsFromStorage('[]').projects, []);
  const one = projectsFromStorage(JSON.stringify([{ id: 'proj-x', name: 'X' }])).projects;
  assert.deepEqual(one.map((p) => p.id), ['proj-x']);
});
