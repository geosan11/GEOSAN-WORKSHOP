/**
 * The single operator workspace. Every project, task, cost event and QA run
 * belongs to it. Client projects are records inside the workspace, never the
 * workspace itself. Same id as the default of the org_id columns in
 * supabase/schema.sql and supabase/migrations/20261028000000_workshop_aligned.sql.
 * (Replaces the client-branded `org-ehi-global` and the interim `org-geosan`.)
 */
export const DEFAULT_WORKSPACE_ID = 'org-geosan-workshop';

export const LEGACY_WORKSPACE_IDS: readonly string[] = ['org-ehi-global', 'org-geosan'];

const LEGACY_WORKSPACE_SET = new Set<string>(LEGACY_WORKSPACE_IDS);

export function normalizeWorkspaceId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0 || LEGACY_WORKSPACE_SET.has(id)) {
    return DEFAULT_WORKSPACE_ID;
  }
  return id;
}
