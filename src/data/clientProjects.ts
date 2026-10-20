/**
 * The ONE seed source for the four current client projects.
 *
 * These are real client records (not demo data). They are written to the
 * local store on first visit only; after that the stored list is the source
 * of truth, so projects can be added or removed freely. No code may assume
 * this list's length or rely on any one of these ids as a fallback.
 *
 * `supabase/schema.sql` seeds the same ids (checked by
 * `src/data/clientProjects.test.ts`).
 *
 * `design_kit` holds a preset id from UI/UX's design-kit preset registry
 * (`src/data/designKitPresets.ts`, not on main yet), so it is a plain string.
 */
import type { Project, ProjectBudget } from '../lib/types';
import { DEFAULT_WORKSPACE_ID } from '../lib/workspace';

/** Canonical ids. Use these constants instead of string literals. */
export const CLIENT_PROJECT_IDS = {
  ehi: 'proj-ehi-001',
  iyanuoluwa: 'proj-iya-002',
  aviation: 'proj-aero-003',
  edgepoint: 'proj-edge-004'
} as const;

export const CLIENT_PROJECTS: Project[] = [
  {
    id: CLIENT_PROJECT_IDS.ehi,
    org_id: DEFAULT_WORKSPACE_ID,
    name: 'EHI Multisystems',
    slug: 'ehi-multisystems',
    vertical: 'Fintech & Enterprise Ledger',
    design_kit: 'ledger-debt-line',
    repo_url: 'https://github.com/ehi-enterprise/ledger-core',
    vercel_deployment_url: 'https://ledger.ehi-multisystems.internal',
    status: 'production',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions:
      'Strict financial invariant testing required. Never push to main branch without ReviewAgent signoff and 100% test pass on settlement reconciliations.',
    monthly_budget_usd: 1200.0,
    health_status: 'healthy',
    uptime_pct: 99.98,
    last_activity_at: '2026-10-03T08:00:00Z'
  },
  {
    id: CLIENT_PROJECT_IDS.iyanuoluwa,
    org_id: DEFAULT_WORKSPACE_ID,
    name: 'Iyanuoluwa Vegetable Oil',
    slug: 'iyanu-oil',
    vertical: 'Agri-processing & Supply Chain',
    design_kit: 'weighbridge-ticket',
    repo_url: 'https://github.com/iyanu-processing/crushing-telemetry',
    vercel_deployment_url: 'https://ops.iyanuoluwa-agro.com',
    status: 'building',
    created_at: '2026-08-25T10:30:00Z',
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions:
      'Offline-first sync for refinery scale-house tablets. Validate Bluetooth weight-bridge driver parity on mobile builds.',
    monthly_budget_usd: 800.0,
    health_status: 'healthy',
    uptime_pct: 99.92,
    last_activity_at: '2026-10-03T08:00:00Z'
  },
  {
    id: CLIENT_PROJECT_IDS.aviation,
    org_id: DEFAULT_WORKSPACE_ID,
    name: 'Aviation Log Entry',
    slug: 'aviation-log',
    vertical: 'Flight Deck & FAA Compliance',
    design_kit: 'flight-logbook',
    repo_url: 'https://github.com/skyfleet-ops/electronic-flight-bag',
    vercel_deployment_url: 'https://efb.skyfleet-aviation.org',
    status: 'testing',
    created_at: '2026-09-01T14:00:00Z',
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions:
      'Strict FAA part 121 compliance audit. All pilot signature flows must be signed with RSA hardware certs.',
    monthly_budget_usd: 1500.0,
    health_status: 'healthy',
    uptime_pct: 99.85,
    last_activity_at: '2026-10-03T08:00:00Z'
  },
  {
    id: CLIENT_PROJECT_IDS.edgepoint,
    org_id: DEFAULT_WORKSPACE_ID,
    name: 'EdgePoint',
    slug: 'edgepoint-gateway',
    vertical: 'IoT Telemetry & Edge Nodes',
    design_kit: 'sensor-telemetry',
    repo_url: 'https://github.com/edgepoint-mesh/sensor-daemon',
    vercel_deployment_url: 'https://telemetry.edgepoint.io',
    status: 'monitoring',
    created_at: '2026-07-15T09:00:00Z',
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions: 'MQTT message latency under 45ms. Synthetic health pings running every 60s via pg_net.',
    monthly_budget_usd: 600.0,
    health_status: 'healthy',
    uptime_pct: 99.99,
    last_activity_at: '2026-10-03T08:00:00Z'
  }
];

/** One budget row per seeded project, derived from the records above. */
export const CLIENT_PROJECT_BUDGETS: ProjectBudget[] = CLIENT_PROJECTS.map((p) => ({
  project_id: p.id,
  monthly_limit_usd: p.monthly_budget_usd ?? 0,
  alert_threshold_pct: 80,
  hard_stop: true
}));
