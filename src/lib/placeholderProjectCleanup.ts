/**
 * One-way, idempotent cleanup of the four placeholder client projects
 * (EHI, Iyanuoluwa, Aviation, EdgePoint) from browser storage.
 *
 * Those projects were hard-coded seeds, not real data. They are removed until
 * real projects are added; this makes sure they don't come back on a device
 * that still has them saved. Matches the Supabase migration
 * `20261030000000_remove_placeholder_projects.sql`.
 *
 * Removed, for every old and canonical id below:
 *   - geosan_projects: the project records;
 *   - geosan_tasks, geosan_costs, geosan_qa_runs, geosan_qa_findings,
 *     geosan_conversations, geosan_messages: records of those projects
 *     (QA findings of a removed run, and messages of a removed conversation,
 *     go with them);
 *   - geosan_linked_components, aetherorch_learning_vault: records whose
 *     projectId matches;
 *   - geosan_session_issue_reports: reports about a removed task;
 *   - aether_recent_destinations: `project-<id>` entries;
 *   - any other geosan_* list: entries whose project_id / projectId matches;
 *   - per-project keys aetherorch_discovery_<id>, geosan_design_brief_<id>,
 *     ehi.disclosure.project-<id>, geosan_project_logs_<id>.
 * Links from OTHER projects' records to a removed task are cleared (set to
 * null), like the database's ON DELETE SET NULL; the records themselves stay.
 * Values that are not valid JSON are left alone.
 */

/** Every id the four placeholder projects were stored under (old and canonical). */
export const PLACEHOLDER_PROJECT_IDS: readonly string[] = Object.freeze([
  'proj-ehi-001',
  'proj-iya-002',
  'proj-iyanu-002',
  'proj-iya-001',
  'proj-aero-003',
  'proj-aviation-003',
  'proj-edge-004',
  'proj-edgepoint-004'
]);

const PLACEHOLDER = new Set(PLACEHOLDER_PROJECT_IDS);
export const isPlaceholderProjectId = (id: unknown): boolean => typeof id === 'string' && PLACEHOLDER.has(id);

/** Keys that embed the project id itself: `<prefix><projectId>`. */
export const PER_PROJECT_KEY_PREFIXES = [
  'aetherorch_discovery_',
  'geosan_design_brief_',
  'ehi.disclosure.project-',
  'geosan_project_logs_'
] as const;

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CleanupReport {
  /** key -> number of entries removed from it */
  removedEntries: Record<string, number>;
  /** per-project keys deleted */
  removedKeys: string[];
  /** keys left alone because the value is not valid JSON */
  skippedKeys: string[];
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const projectOf = (r: Rec) => (r.project_id ?? r.projectId) as unknown;

export function cleanupPlaceholderProjects(storage: StorageLike): CleanupReport {
  const report: CleanupReport = { removedEntries: {}, removedKeys: [], skippedKeys: [] };
  const removedTasks = new Set<string>();
  const removedRuns = new Set<string>();
  const removedConversations = new Set<string>();

  const readList = (key: string): unknown[] | null => {
    const raw = storage.getItem(key);
    if (raw == null) return null;
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : null;
    } catch {
      if (!report.skippedKeys.includes(key)) report.skippedKeys.push(key);
      return null;
    }
  };
  const write = (key: string, before: unknown[], after: unknown[], changed = false) => {
    const removed = before.length - after.length;
    if (removed > 0) report.removedEntries[key] = (report.removedEntries[key] ?? 0) + removed;
    if (removed > 0 || changed) storage.setItem(key, JSON.stringify(after));
  };
  /** Drops entries matching `drop`; `collect` sees each dropped entry. */
  const filterKey = (key: string, drop: (r: Rec) => boolean, collect?: (r: Rec) => void) => {
    const list = readList(key);
    if (!list) return;
    const kept = list.filter((e) => {
      if (isRec(e) && drop(e)) {
        collect?.(e);
        return false;
      }
      return true;
    });
    write(key, list, kept);
  };
  const id = (r: Rec) => (typeof r.id === 'string' ? r.id : '');

  // Order matters: parents first, so their children can be matched too.
  filterKey('geosan_projects', (r) => isPlaceholderProjectId(r.id));
  filterKey('geosan_tasks', (r) => isPlaceholderProjectId(projectOf(r)), (r) => removedTasks.add(id(r)));
  filterKey('geosan_qa_runs', (r) => isPlaceholderProjectId(projectOf(r)), (r) => removedRuns.add(id(r)));
  filterKey('geosan_qa_findings', (r) => isPlaceholderProjectId(projectOf(r)) || removedRuns.has(r.run_id as string));
  filterKey('geosan_costs', (r) => isPlaceholderProjectId(projectOf(r)));
  filterKey('geosan_conversations', (r) => isPlaceholderProjectId(projectOf(r)), (r) => removedConversations.add(id(r)));
  filterKey('geosan_messages', (r) => isPlaceholderProjectId(projectOf(r)) || removedConversations.has(r.conversation_id as string));
  filterKey('geosan_linked_components', (r) => isPlaceholderProjectId(projectOf(r)));
  filterKey('geosan_session_issue_reports', (r) => removedTasks.has(r.sessionId as string) || isPlaceholderProjectId(projectOf(r)));
  filterKey('aetherorch_learning_vault', (r) => isPlaceholderProjectId(projectOf(r)));

  // Other projects' links to a removed task are cleared (ON DELETE SET NULL).
  if (removedTasks.size > 0) {
    for (const [key, field] of [['geosan_tasks', 'parent_task_id'], ['geosan_costs', 'task_id']] as const) {
      const list = readList(key);
      if (!list) continue;
      let changed = false;
      const next = list.map((e) => {
        if (isRec(e) && typeof e[field] === 'string' && removedTasks.has(e[field] as string)) {
          changed = true;
          return { ...e, [field]: null };
        }
        return e;
      });
      if (changed) write(key, list, next, true);
    }
  }

  const recents = readList('aether_recent_destinations');
  if (recents) {
    write(
      'aether_recent_destinations',
      recents,
      recents.filter((d) => !(typeof d === 'string' && d.startsWith('project-') && isPlaceholderProjectId(d.slice('project-'.length))))
    );
  }

  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k) keys.push(k);
  }
  const handled = new Set([
    'geosan_projects', 'geosan_tasks', 'geosan_qa_runs', 'geosan_qa_findings', 'geosan_costs',
    'geosan_conversations', 'geosan_messages', 'geosan_linked_components', 'geosan_session_issue_reports'
  ]);
  for (const key of keys) {
    const prefix = PER_PROJECT_KEY_PREFIXES.find((p) => key.startsWith(p));
    if (prefix) {
      if (isPlaceholderProjectId(key.slice(prefix.length))) {
        storage.removeItem(key);
        report.removedKeys.push(key);
      }
      continue;
    }
    // Any other saved geosan_* list: drop entries of a placeholder project.
    if (key.startsWith('geosan_') && !handled.has(key)) filterKey(key, (r) => isPlaceholderProjectId(projectOf(r)));
  }
  return report;
}

/** Browser entry point; a no-op outside the browser or if storage is blocked. */
export function runPlaceholderProjectCleanup(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    cleanupPlaceholderProjects(window.localStorage);
  } catch {
    /* storage unavailable (private mode etc.): nothing to clean */
  }
}
