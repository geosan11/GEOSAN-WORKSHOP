# AetherOrch Command Center

The enterprise frontend for a multi-agent software orchestration platform managing the complete software lifecycle across client verticals (**EHI Multisystems**, **Iyanuoluwa Vegetable Oil**, **Aviation Log Entry**, **EdgePoint**).

## 🧭 Navigation Architecture & Views

The app features a responsive top navigation bar (desktop) and bottom navigation bar (mobile) with zero external routing dependencies:

1. **Portfolio (`PORTFOLIO`)**: High-level multi-tenant project registry, health status, running task counters, monthly spend, and real-time live activity feed.
2. **Project Detail (`PROJECT_DETAIL`)**: Deep-dive into a single managed vertical with 5 scoped sub-tabs:
   - *Overview*: Uptime health, deployment and repo links, governance policy.
   - *Tasks*: Virtualized, sortable table of all agent tasks with status filters.
   - *QA*: Historical automated test runs and findings count.
   - *Costs*: Project-scoped daily spend line chart and foundation model provider allocation.
   - *Settings & Budget*: Project monthly spend caps, alert thresholds, and hard-stop enforcement toggle.
3. **Agent Console (`AGENT_CONSOLE`)**: Direct prompt dispatch interface to `CoordinatorAgent` with task type chips, prompt editor, recent dispatch feed, and inline `PlanApproval`.
4. **Cost Center (`COST_CENTER`)**: FinOps analytics dashboard with period selector (Today / Week / Month / Quarter / All Time), SVG 30-day spend trend, provider pie chart, top 10 attributed features by spend, and virtualized inference transaction ledger.
5. **QA Workbench (`QA_RUNS`)**: Autonomous testing results dashboard across Web, Mobile (Maestro), and API (Schemathesis), with filter chips and sliding findings drawer featuring 120x90 screenshot thumbnails, numbered reproduction steps, and one-click fix task dispatch.
6. **Settings & Governance (`SETTINGS`)**: Organization and staff operator session details, project budget configuration table, active prompt version viewer, and **Sign Out** button.
7. **Codebase Analyzer (`REPO_ANALYZER`)**: Automated AST code parsing, security vulnerability scanner, dependency health auditor, and interactive visual file graph.
8. **Agent Swarm Workbench (`AGENT_SWARM`)**: Real-time agent collaboration canvas, task decomposition monitor, sub-agent telemetry, and inter-agent message inspection.
9. **Production Monitoring (`PRODUCTION_MONITORING`)**: Edge probe synthetic monitoring engine, endpoint latency breakdown, uptime SLA tracking, and alert dispatch ledger.
10. **Model Router Intelligence (`MODEL_ROUTER`)**: Multi-provider LLM benchmarking (Gemini 3.5, Claude 3.7, DeepSeek R1/V3, Grok 4), cost/latency optimization engine, and fallback rule configurator.

*Authentication Gate*: **Login Screen (`LOGIN`)** gates staff access if no session is active.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript (Strict Mode)
- **Bundler**: Vite 6+ / 8+
- **Styling**: Tailwind CSS v4 (CSS-first theme configuration in `src/index.css` using EHI Brand Tokens)
- **Charts**: Custom SVG Charting Components (`CostChart`, `CostPieChart`)
- **Virtualization**: `@tanstack/react-virtual` for high-throughput tables
- **Icons**: `lucide-react`
- **Backend & Realtime**: In-memory Demo Harness + Server Telemetry Middleware (`server/telemetry-gateway.ts`)

---

## 🚀 Running & Verifying the App

### Demo Mode (Zero Backend Required)
If `VITE_SUPABASE_URL` is omitted, the Command Center automatically runs in **Demo Mode**:
- Renders rich realistic mock data across all 4 verticals.
- In-memory mutations update the UI immediately (dispatches, approvals, rejections, resolves).
- Displays a `DEMO MODE` gold indicator pill in the top navigation bar.

```bash
npm install
npm run dev
```

### Deterministic Verification & Build
To verify type safety, system invariants, and production build artifact generation:

```bash
# Cross-platform TypeScript lint and Vite build check
npm run verify

# Windows PowerShell deterministic test harness
powershell scripts/verify.ps1
```
