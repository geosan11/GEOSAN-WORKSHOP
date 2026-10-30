# GEOSAN Workshop — System Handoff Summary

This document provides a concise summary of the architecture, newly implemented features, execution instructions, and recommended next steps for **GEOSAN Workshop**.

---

## 1. What Was Implemented in This Round

### A. Database Schema & Realtime Alignment
- **SQL Migration**: Created [`supabase/migrations/20261028000000_workshop_aligned.sql`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/supabase/migrations/20261028000000_workshop_aligned.sql) adding:
  - `projects` table (with `archetype`, `source_type`, `source_ref`, `advisor_provider`, `advisor_agent_name`, `progress`, `next_step`).
  - `project_logs` table with indexed `jsonb` payloads.
  - `agent_assignments` table with role definitions and `paused` status support.
  - `provider_configs` and `user_preferences` (persisting `font_scale`).
  - Triggers (`set_updated_at`), PostgreSQL Realtime publication, and Row Level Security (RLS) policies.

### B. UI Screens & Dark-Mode Redesign
- **Projects Screen** ([`src/screens/ProjectsScreen.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/screens/ProjectsScreen.tsx)):
  - Compact cards displaying project name, status badge, thin gradient progress bar + %, last update, and next step box.
  - Dual primary action buttons: `+ New Project` and `+ Attach Existing`.
  - Empty state with `HowToStartCards` and a 1-click **"Load demo scenario"** button.
- **Project Creation & Attachment Modal** ([`src/components/WorkshopProjectModal.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/components/WorkshopProjectModal.tsx)):
  - Step 0 archetype chips: *Frontend Prototype*, *Full-Stack App*, *Automation Script*, *Data Pipeline*, *Custom*.
  - Archetype default pre-fills for tech stack chips, enabled providers, and assigned advisors.
  - GitHub repo attachment supporting `owner/repo` or full HTTPS URL, with an inline **"Verify repo"** button.
- **Project Monitoring & Detail** ([`src/screens/ProjectDetail.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/screens/ProjectDetail.tsx)):
  - Top header with status pill, **"Pause Agents" / "Resume"** button, and **"View on GitHub"** external link.
  - Overview KPI tiles: Current Status / Next Step, Active Agents (with *"Waiting for Supervisor"* fallback), Last Update, Month Spend / Cap.
  - Strategic Advisor Card displaying the assigned advisor and live preview of the last 2–3 recommendations.
  - Real-time chronological activity log with filter chips (All, Errors, Status, Agent, Advice).
  - Expandable monospace log viewer rendering syntax diffs, markdown, or formatted JSONB with a 1-click **"Copy Output"** button.
  - Dual-mode compact prompt dock (`Supervisor` directive vs. `Advisor` review).
- **Settings Screen** ([`src/screens/Settings.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/screens/Settings.tsx)):
  - Global **Interface Scale** control (Small / Medium / Large) applying root `data-scale` and `--font-scale`.
  - **Connected Providers** section (Grok Bots, Google AI Pro, Claude, DeepSeek, GitHub).
  - **Demo & Offline Scenarios** section with 1-click demo scenario loader.

### C. Orchestration & Supervisor Contract
- **Contract Specification**: [`docs/SUPERVISOR_HANDOFF.md`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/docs/SUPERVISOR_HANDOFF.md).
- **TypeScript Brief Builder**: [`src/lib/supervisor.ts`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/lib/supervisor.ts) (`buildSupervisorBrief`).
- **Read-Only Advisor Guard**: Advisor entries write structured advice to `project_logs` (`action_type = 'advice'`) and cannot mutate project status or write code autonomously.

---

## 2. How to Run Locally

### Mode A: Deterministic Demo Mode (Zero Credentials Required)
1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000`. The app runs locally with `localStorage` persistence and cross-tab reactive events.
4. Click **"Load demo scenario"** on the Projects screen to load **TaskPulse**, **EdgeTelemetry**, and **OmniScraper**.

### Mode B: Connected Supabase Mode
1. Configure `.env`:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
2. Apply the migration:
   ```bash
   supabase db push
   # or run supabase/migrations/20261028000000_workshop_aligned.sql in Supabase SQL editor
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 3. Key Files Changed or Added

| Path | Description |
| :--- | :--- |
| [`supabase/migrations/20261028000000_workshop_aligned.sql`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/supabase/migrations/20261028000000_workshop_aligned.sql) | Workshop schema migration (projects, logs, agent assignments, RLS) |
| [`src/lib/supervisor.ts`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/lib/supervisor.ts) | Supervisor brief types & `buildSupervisorBrief()` builder |
| [`src/lib/demoScenario.ts`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/lib/demoScenario.ts) | Pre-seeded demo scenario (`TaskPulse` with diffs and advice logs) |
| [`src/lib/fontScale.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/lib/fontScale.tsx) | Global font scaling provider (`--font-scale` & `data-scale`) |
| [`src/hooks/useProjectRealtime.ts`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/hooks/useProjectRealtime.ts) | Realtime log streaming & cross-tab demo event synchronization |
| [`src/components/WorkshopProjectModal.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/components/WorkshopProjectModal.tsx) | Archetype project modal with GitHub format verification |
| [`src/screens/ProjectsScreen.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/screens/ProjectsScreen.tsx) | Compact dark-mode project grid with progress & next steps |
| [`src/screens/ProjectDetail.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/screens/ProjectDetail.tsx) | Monitoring view, pause control, monospace logs & advisor dock |
| [`src/screens/Settings.tsx`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/screens/Settings.tsx) | Interface scale selector, connected providers & demo loader |
| [`scripts/smoke-tests.ts`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/scripts/smoke-tests.ts) | Automated UI contract and smoke test suite |
| [`docs/SUPERVISOR_HANDOFF.md`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/docs/SUPERVISOR_HANDOFF.md) | Formal Supervisor / Orchestrator handoff contract |
| [`docs/DEMO_WALKTHROUGH.md`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/docs/DEMO_WALKTHROUGH.md) | Step-by-step click guide for demonstrating the platform |
| [`docs/DEPLOYMENT.md`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/docs/DEPLOYMENT.md) | Environment configuration, host settings & deploy checklist |

---

## 4. Supervisor Brief Contract

The exact shape dispatched to orchestrators is defined in [`src/lib/supervisor.ts`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/src/lib/supervisor.ts#L8-L23) and [`docs/SUPERVISOR_HANDOFF.md`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/docs/SUPERVISOR_HANDOFF.md):

```typescript
export interface SupervisorBrief {
  id: string;                                    // Unique project UUID
  name: string;                                  // Project display name
  goal: string;                                  // User instructions / objective
  archetype: string;                             // 'Full-Stack App' | 'Frontend Prototype' | etc.
  stack: string[];                               // Selected tech chips (e.g. ['React', 'Supabase'])
  deadline: string | null;                       // Optional ISO deadline
  enabled_providers: string[];                   // e.g. ['Claude', 'DeepSeek', 'GitHub']
  source_type: 'template' | 'github' | 'external' | string;
  source_ref: string | null;                     // GitHub owner/repo or clone URL
  advisor_provider: string | null;               // e.g. 'Anthropic'
  advisor_agent_name: string | null;             // e.g. 'ReviewAgent'
  progress: number;                              // 0 - 100 percentage
  next_step: string | null;                      // Current pending milestone description
  created_at: string;                            // ISO 8601 timestamp
  status: string;                                // 'planning' | 'building' | etc.
}
```

---

## 5. Known Limitations & Recommended Next Steps

1. **GitHub OAuth Flow**: Basic attachment currently verifies format client-side without requiring API tokens. The next enhancement can connect live GitHub OAuth to read repository branches and PR statuses directly.
2. **Supervisor Webhook Endpoint**: While the frontend writes prompts and pause status to Supabase Realtime / local state, adding a dedicated edge function webhook (e.g. `/api/supervisor/dispatch`) will allow external autonomous bots (like Grok Bots or Antigravity agents) to receive push triggers.
3. **Live Model Synthesis**: Server proxy routing handles model pricing; connecting live Anthropic and DeepSeek streaming API adapters to the Supervisor will enable fully autonomous multi-turn loops.
