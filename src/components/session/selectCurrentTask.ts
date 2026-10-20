import type { AgentTask, Project } from '../../lib/types';

/**
 * Picks the task a project's workspace should show.
 *
 * Order: the requested task (only if it belongs to this project), then this
 * project's running task, then its task awaiting approval, then any of its
 * tasks. Never another project's task.
 *
 * The built-in demo task is a last resort, and only in demo mode. Otherwise
 * the result is `undefined` and the caller shows an empty state.
 *
 * Regression: this used to be `a || b || c || d || DEMO[0] ? demo : tasks[0]`.
 * `?:` binds looser than `||` and `DEMO[0]` is always truthy, so every project
 * got the fake "Kano Hub" task.
 */
export function selectCurrentTask(
  tasks: readonly AgentTask[],
  project: Pick<Project, 'id' | 'org_id'>,
  taskId: string | undefined,
  options: { demoMode: boolean }
): AgentTask | undefined {
  const own = tasks.filter((t) => t.project_id === project.id);
  return (
    (taskId ? own.find((t) => t.id === taskId) : undefined) ||
    own.find((t) => t.status === 'running') ||
    own.find((t) => t.status === 'awaiting_approval') ||
    own[0] ||
    (options.demoMode ? buildDemoTask(project) : undefined)
  );
}

/** The demo-mode placeholder task, scoped to the given project. */
export function buildDemoTask(project: Pick<Project, 'id' | 'org_id'>): AgentTask {
  const now = new Date().toISOString();
  return {
    id: 'task-session-running-01',
    org_id: project.org_id,
    project_id: project.id,
    task_type: 'BUILD_FEATURE',
    prompt:
      'Implement bilateral netting engine for Kano Hub settlement\nEnsure strict integer arithmetic for kobo precision and generate verifiable settlement receipts.',
    status: 'running',
    assigned_agent: 'FullStackAgent',
    plan: { summary: 'Bilateral netting engine with atomic transaction' },
    result: {
      changed_files: ['src/settlement/bilateralNetting.ts', 'src/api/routes/settle.ts', 'test/settlementNetting.spec.ts']
    },
    branch_name: 'feat/kano-netting-engine',
    pr_url: null,
    created_at: now,
    started_at: now,
    completed_at: null,
    parent_task_id: null
  } as AgentTask;
}
