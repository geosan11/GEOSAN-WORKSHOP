/**
 * The single operator workspace. Every project, task, cost event and QA run
 * belongs to it. Clients (EHI, Iyanuoluwa, ...) are records inside the
 * workspace, never the workspace itself.
 *
 * Previously the client-branded id `org-ehi-global` was used here; the old id
 * is remapped by `src/lib/projectIdMigration.ts` and the Supabase migration
 * `20261020010000_canonical_project_ids.sql`.
 */
export const DEFAULT_WORKSPACE_ID = 'org-geosan';
