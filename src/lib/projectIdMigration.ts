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
 * is left alone. When an object has keys for both an old and the canonical
 * id of the same project, the canonical key's value wins (as in the database).
 */
export function remapLegacyIds<T>(value: T): T {
  if (typeof value === 'string') return remapString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => remapLegacyIds(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const out: Record<string, unknown> = {};
    // Keys that are not old ids first, so a canonical key is never overwritten.
    for (const [k, v] of entries) {
      if (remapString(k) === k) out[k] = remapLegacyIds(v);
    }
    for (const [k, v] of pickPerTarget(entries.filter(([k]) => remapString(k) !== k), ([, v]) => v)) {
      const target = remapString(k);
      if (!(target in out)) out[target] = remapLegacyIds(v);
    }
    return out as T;
  }
  return value;
}

/** Latest of `updated_at` / `created_at` (ms), or -Infinity if neither parses. */
function recency(item: unknown): number {
  if (!item || typeof item !== 'object') return -Infinity;
  const rec = item as Record<string, unknown>;
  for (const field of ['updated_at', 'updatedAt', 'lastUpdated', 'created_at', 'createdAt']) {
    const t = typeof rec[field] === 'string' ? Date.parse(rec[field] as string) : NaN;
    if (!Number.isNaN(t)) return t;
  }
  return -Infinity;
}

/**
 * Among old-id entries that map to the same canonical id, keeps one: the most
 * recently updated (updated_at, else created_at); ties keep the first listed.
 */
function pickPerTarget<E extends [string, unknown]>(entries: E[], record: (e: E) => unknown): E[] {
  const best = new Map<string, E>();
  for (const e of entries) {
    const target = remapString(e[0]);
    const cur = best.get(target);
    if (!cur || recency(record(e)) > recency(record(cur))) best.set(target, e);
  }
  return [...best.values()];
}

/**
 * Merge rule for a list of records after remapping (same rule as the SQL
 * migration): for each id keep one record. A record that already had the
 * canonical id wins; otherwise the most recently updated old-id record
 * (updated_at, else created_at; ties: first listed). The kept record takes
 * the position of the first record with that id.
 */
function dedupeById(original: unknown[], remapped: unknown[]): unknown[] {
  const idOf = (item: unknown) =>
    item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string'
      ? ((item as Record<string, unknown>).id as string)
      : null;
  const winner = new Map<string, number>();
  remapped.forEach((item, i) => {
    const id = idOf(item);
    if (id == null) return;
    const cur = winner.get(id);
    if (cur === undefined) return void winner.set(id, i);
    const curCanonical = idOf(original[cur]) === id;
    const thisCanonical = idOf(original[i]) === id;
    if (curCanonical) return;
    if (thisCanonical || recency(original[i]) > recency(original[cur])) winner.set(id, i);
  });
  const out: unknown[] = [];
  const placed = new Set<string>();
  remapped.forEach((item) => {
    const id = idOf(item);
    if (id == null) return void out.push(item);
    if (placed.has(id)) return;
    placed.add(id);
    out.push(remapped[winner.get(id)!]);
  });
  return out;
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
export const MIGRATED_KEY_PREFIXES = [
  'aetherorch_discovery_',
  'geosan_design_brief_',
  'ehi.disclosure.project-'
] as const;

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
  /** Old per-project keys removed because the canonical key already had data. */
  droppedKeys: string[];
  /** Keys left alone because their value is not valid JSON. */
  skippedKeys: string[];
}

/**
 * Rewrites old ids in `storage`. Safe to run on every start: a second run
 * finds nothing to change. Values that are not valid JSON are left as is.
 * Where both an old-id and a canonical-id entry exist, the canonical one wins
 * and the old one is removed, matching the database migration.
 */
export function migrateLegacyProjectIds(storage: StorageLike): MigrationReport {
  const report: MigrationReport = { rewrittenKeys: [], renamedKeys: [], droppedKeys: [], skippedKeys: [] };

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
    if (Array.isArray(next) && Array.isArray(parsed)) {
      if (key === 'geosan_projects') next = dedupeById(parsed, next);
      else if (key === 'aether_recent_destinations') next = next.filter((v, i, arr) => arr.indexOf(v) === i);
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
  // Group old per-project keys by their canonical key.
  const groups = new Map<string, string[]>();
  for (const key of keys) {
    const prefix = MIGRATED_KEY_PREFIXES.find((p) => key.startsWith(p));
    if (!prefix) continue;
    const newId = LEGACY_PROJECT_ID_MAP[key.slice(prefix.length)];
    if (!newId) continue;
    const target = `${prefix}${newId}`;
    groups.set(target, [...(groups.get(target) ?? []), key]);
  }
  const parseOrNull = (raw: string | null): unknown => {
    try {
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  };
  for (const [target, oldKeys] of groups) {
    // Same rule as the lists: canonical key wins; else the most recently
    // updated old key (ties: first found).
    let keep: string | null = null;
    if (storage.getItem(target) == null) {
      for (const k of oldKeys) {
        if (keep == null || recency(parseOrNull(storage.getItem(k))) > recency(parseOrNull(storage.getItem(keep)))) keep = k;
      }
    }
    for (const key of oldKeys) {
      const raw = storage.getItem(key);
      if (key === keep && raw != null) {
        let value = raw;
        try {
          value = JSON.stringify(remapLegacyIds(JSON.parse(raw)));
        } catch {
          /* keep raw value */
        }
        storage.setItem(target, value);
        report.renamedKeys.push({ from: key, to: target });
      } else {
        report.droppedKeys.push(key);
      }
      // Remove the old key either way, so it isn't seen on the next load.
      storage.removeItem(key);
    }
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
