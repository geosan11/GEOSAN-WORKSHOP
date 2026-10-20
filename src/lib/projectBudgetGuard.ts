/**
 * Fail-closed budget guard for AI work.
 *
 * A project with no budget is BLOCKED from running AI work: no task can be
 * dispatched, approved, re-queued or confirmed for it, and no AI chat call is
 * made, until a budget is set. A missing budget never means "unlimited".
 *
 * "Has a budget" means an amount greater than 0 (USD per month): a finite
 * number, or a plain decimal string such as '100.00' (how a Postgres
 * `numeric` column arrives from a driver / PostgREST). Missing, null, NaN,
 * '', 'abc', '0', 0, negative values and anything else block.
 *
 * Where it is enforced today (all client side, see tests):
 *   - useTasks: createTask / approveTask / retryTask / confirmProposedTask
 *   - useChat: before POST /api/ai/chat
 *   - budget.ts requestProjectBudgetAdmit (ProjectChatTab "ask")
 * Server side there is no per-project budget data yet; the step 3 run worker
 * (and server.js /api/ai/chat) must call checkProjectBudget with the
 * project_budgets row before any model call.
 */

export interface BudgetSource {
  id?: string;
  name?: string;
  monthly_budget_usd?: unknown;
}

/** A row from project_budgets (null/undefined = no row). */
export interface BudgetRow {
  monthly_limit_usd?: unknown;
}

export type BudgetCheck =
  | { ok: true; budgetUsd: number }
  | { ok: false; reason: string };

/** Plain decimal (no sign, exponent, hex or spaces inside): '100', '100.00', '.5'. */
const DECIMAL = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * The budget amount as a number, or null if `v` is not one: a finite number,
 * or a plain decimal string (surrounding spaces allowed). Says nothing about
 * whether the amount is > 0; see validBudget.
 */
export function toBudgetNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && DECIMAL.test(v.trim())) return Number(v.trim());
  return null;
}

/** A usable budget: an amount (see toBudgetNumber) greater than 0. */
export function validBudget(v: unknown): number | null {
  const n = toBudgetNumber(v);
  return n !== null && n > 0 ? n : null;
}

function label(project: BudgetSource | null | undefined, projectId?: string): string {
  const id = project?.id ?? projectId ?? 'unknown project';
  return project?.name ? `${project.name} (${id})` : id;
}

/**
 * Checks whether AI work may run for `project`.
 * With a `budgetRow` argument (server / run worker reading project_budgets),
 * that row is authoritative: `null` means "no budget row" and blocks.
 * Without it, the project's `monthly_budget_usd` is used (browser data).
 */
export function checkProjectBudget(
  project: BudgetSource | null | undefined,
  options: { projectId?: string; budgetRow?: BudgetRow | null } = {}
): BudgetCheck {
  const who = label(project, options.projectId);
  if (!project && !('budgetRow' in options)) {
    return { ok: false, reason: `AI work blocked: project ${who} was not found, so it has no budget.` };
  }
  const raw = 'budgetRow' in options ? options.budgetRow?.monthly_limit_usd : project?.monthly_budget_usd;
  const missing = raw === undefined || raw === null || ('budgetRow' in options && !options.budgetRow);
  const budget = validBudget(raw);
  if (budget !== null) return { ok: true, budgetUsd: budget };
  return {
    ok: false,
    reason: missing
      ? `AI work blocked: ${who} has no monthly budget. Set a budget for this project before running AI work.`
      : `AI work blocked: ${who} has an invalid monthly budget (${JSON.stringify(raw)}). Set a budget greater than $0 before running AI work.`
  };
}

export class ProjectBudgetBlockedError extends Error {
  readonly code = 'PROJECT_BUDGET_MISSING';
  constructor(message: string) {
    super(message);
    this.name = 'ProjectBudgetBlockedError';
  }
}

export function isProjectBudgetBlocked(err: unknown): err is ProjectBudgetBlockedError {
  return err instanceof ProjectBudgetBlockedError;
}

/** Throws ProjectBudgetBlockedError unless AI work may run for `project`. */
export function assertProjectBudget(
  project: BudgetSource | null | undefined,
  options: { projectId?: string; budgetRow?: BudgetRow | null } = {}
): number {
  const check = checkProjectBudget(project, options);
  if (!check.ok) throw new ProjectBudgetBlockedError(check.reason);
  return check.budgetUsd;
}
