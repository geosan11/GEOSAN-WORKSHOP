import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectCurrentTask } from './selectCurrentTask';
import type { AgentTask } from '../../lib/types';

const task = (id: string, project_id: string, status: AgentTask['status']): AgentTask =>
  ({ id, project_id, status, org_id: 'org-geosan-workshop', prompt: id } as AgentTask);

const A = { id: 'proj-a', org_id: 'org-geosan-workshop' };
const B = { id: 'proj-b', org_id: 'org-geosan-workshop' };

test('regression: a project with no tasks does not get the fake Kano Hub task outside demo mode', () => {
  const tasks = [task('t-b', B.id, 'running')];
  assert.equal(selectCurrentTask(tasks, A, undefined, { demoMode: false }), undefined);
  assert.equal(selectCurrentTask([], A, undefined, { demoMode: false }), undefined);
});

test("regression: a project's real task wins over the demo task, even in demo mode", () => {
  const tasks = [task('t-a', A.id, 'queued')];
  const picked = selectCurrentTask(tasks, A, undefined, { demoMode: true });
  assert.equal(picked?.id, 't-a');
  assert.doesNotMatch(picked?.prompt ?? '', /Kano/);
});

test('never returns another project\'s task (no tasks[0] fallback)', () => {
  const tasks = [task('t-b1', B.id, 'running'), task('t-b2', B.id, 'awaiting_approval')];
  assert.equal(selectCurrentTask(tasks, A, undefined, { demoMode: false }), undefined);
});

test('a requested task id from another project is ignored', () => {
  const tasks = [task('t-b', B.id, 'running'), task('t-a', A.id, 'done')];
  assert.equal(selectCurrentTask(tasks, A, 't-b', { demoMode: false })?.id, 't-a');
});

test('order: requested, then running, then awaiting approval, then any', () => {
  const tasks = [
    task('t-done', A.id, 'done'),
    task('t-wait', A.id, 'awaiting_approval'),
    task('t-run', A.id, 'running')
  ];
  assert.equal(selectCurrentTask(tasks, A, 't-done', { demoMode: false })?.id, 't-done');
  assert.equal(selectCurrentTask(tasks, A, undefined, { demoMode: false })?.id, 't-run');
  assert.equal(selectCurrentTask(tasks.slice(0, 2), A, undefined, { demoMode: false })?.id, 't-wait');
  assert.equal(selectCurrentTask(tasks.slice(0, 1), A, undefined, { demoMode: false })?.id, 't-done');
});

test('demo mode, no tasks: the demo task is the last resort and is scoped to this project', () => {
  const picked = selectCurrentTask([task('t-b', B.id, 'running')], A, undefined, { demoMode: true });
  assert.equal(picked?.id, 'task-session-running-01');
  assert.equal(picked?.project_id, A.id);
});
