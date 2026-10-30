/**
 * The single operator workspace. Every project, task, cost event and QA run
 * belongs to it. Client projects are records inside the workspace, never the
 * workspace itself. Same id as the default of the org_id columns in
 * supabase/schema.sql and supabase/migrations/20261028000000_workshop_aligned.sql.
 * (Replaces the client-branded `org-ehi-global` and the interim `org-geosan`.)
 */
export const DEFAULT_WORKSPACE_ID = 'org-geosan-workshop';
