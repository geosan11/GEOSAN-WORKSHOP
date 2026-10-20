/**
 * One-way, idempotent rewrite of data saved under old project / workspace ids.
 *
 * The four client projects used to be stored under several id variants
 * (e.g. `proj-iyanu-002`, `proj-aviation-003`) and every row carried the
 * client-branded workspace id `org-ehi-global`. This module maps them onto the
 * canonical ids in `src/data/clientProjects.ts`.
 *
 * This file (plus the matching Supabase migration and their tests) is the
 * only place the old ids may appear.
 */
import { DEFAULT_WORKSPACE_ID } from './workspace';

/** old project id -> canonical project id */
export const LEGACY_PROJECT_ID_MAP: Readonly<Record<string, string>> = Object.freeze({
  'proj-iya-001': 'proj-iya-002',
  'proj-iyanu-002': 'proj-iya-002',
  'proj-aviation-003': 'proj-aero-003',
  'proj-edgepoint-004': 'proj-edge-004'
});

/** old workspace / org id -> canonical workspace id */
export const LEGACY_WORKSPACE_ID_MAP: Readonly<Record<string, string>> = Object.freeze({
  'org-ehi-global': DEFAULT_WORKSPACE_ID
});

const ALL_IDS: Readonly<Record<string, string>> = Object.freeze({
  ...LEGACY_PROJECT_ID_MAP,
  ...LEGACY_WORKSPACE_ID_MAP
});

/** Returns the canonical id for `id` (unchanged if it is not an old id). */
export function canonicalProjectId(id: string): string;
export function canonicalProjectId(id: string | null | undefined): string | null | undefined;
export function canonicalProjectId(id: string | null | undefined) {
  if (typeof id !== 'string') return id;
  return LEGACY_PROJECT_ID_MAP[id] ?? id;
}

/** Remaps an exact old id, or a `project-<old id>` command-palette destination. */
function remapString(value: string): string {
  const direct = ALL_IDS[value];
  if (direct) return direct;
  if (value.startsWith('project-')) {
    const mapped = LEGACY_PROJECT_ID_MAP[value.slice('project-'.length)];
    if (mapped) return `project-${mapped}`;
  }
  return value;
}

/**
 * Deep-copies `value`, replacing any string that is exactly an old id.
 * Only exact matches are replaced, so free text that merely mentions an id
 * is left alone.
 */
export function remapLegacyIds<T>(value: T): T {
  if (typeof value === 'string') return remapString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => remapLegacyIds(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[remapString(k)] = remapLegacyIds(v);
    }
    return out as T;
  }
  return value;
}

/** Drops later entries whose `id` (or `project_id` for budgets) repeats. */
function dedupeById(list: unknown[]): unknown[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    if (!item || typeof item !== 'object') return true;
    const rec = item as Record<string, unknown>;
    const key = typeof rec.id === 'string' ? rec.id : null;
    if (key == null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** JSON values in localStorage that can contain project / workspace ids. */
export const MIGRATED_JSON_KEYS = [
  'geosan_projects',
  'geosan_tasks',
  'geosan_costs',
  'geosan_qa_runs',
  'geosan_qa_findings',
  'geosan_conversations',
  'geosan_messages',
  'geosan_linked_components',
  'geosan_session_issue_reports',
  'aetherorch_learning_vault',
  'aether_recent_destinations',
  'ehi_auth_session'
] as const;

/** Keys that embed the project id itself: `<prefix><projectId>`. */
export const MIGRATED_KEY_PREFIXES = ['aetherorch_discovery_', 'geosan_design_brief_'] as const;

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface MigrationReport {
  rewrittenKeys: string[];
  renamedKeys: Array<{ from: string; to: string }>;
  skippedKeys: string[];
}

/**
 * Rewrites old ids in `storage`. Safe to run on every start: a second run
 * finds nothing to change. Values that are not valid JSON are left as is.
 * A per-project key is only renamed when the canonical key is not already
 * taken, so newer data is never overwritten.
 */
export function migrateLegacyProjectIds(storage: StorageLike): MigrationReport {
  const report: MigrationReport = { rewrittenKeys: [], renamedKeys: [], skippedKeys: [] };

  for (const key of MIGRATED_JSON_KEYS) {
    const raw = storage.getItem(key);
    if (raw == null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      report.skippedKeys.push(key);
      continue;
    }
    let next = remapLegacyIds(parsed);
    if (Array.isArray(next) && (key === 'geosan_projects' || key === 'aether_recent_destinations')) {
      next =
        key === 'geosan_projects'
          ? dedupeById(next)
          : (next.filter((v, i, arr) => arr.indexOf(v) === i) as unknown[]);
    }
    const serialized = JSON.stringify(next);
    if (serialized !== JSON.stringify(parsed)) {
      storage.setItem(key, serialized);
      report.rewrittenKeys.push(key);
    }
  }

  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k) keys.push(k);
  }
  for (const key of keys) {
    const prefix = MIGRATED_KEY_PREFIXES.find((p) => key.startsWith(p));
    if (!prefix) continue;
    const oldId = key.slice(prefix.length);
    const newId = LEGACY_PROJECT_ID_MAP[oldId];
    if (!newId) continue;
    const target = `${prefix}${newId}`;
    if (storage.getItem(target) != null) {
      report.skippedKeys.push(key);
      continue;
    }
    const raw = storage.getItem(key);
    if (raw == null) continue;
    let value = raw;
    try {
      value = JSON.stringify(remapLegacyIds(JSON.parse(raw)));
    } catch {
      /* keep raw value */
    }
    storage.setItem(target, value);
    storage.removeItem(key);
    report.renamedKeys.push({ from: key, to: target });
  }

  return report;
}

/** Browser entry point; a no-op outside the browser or if storage is blocked. */
export function runLegacyProjectIdMigration(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    migrateLegacyProjectIds(window.localStorage);
  } catch {
    /* storage unavailable (private mode etc.): nothing to migrate */
  }
}
