# Inventory of Disconnected Files & Reconnection Strategy

Following commit `7793bfa` ("complete visual replacement batch"), exactly **55 files** in `src` became disconnected from the app entry and routing tree (`src/main.tsx` → `src/App.tsx`). This document groups every disconnected file by feature domain, gives a recommendation for each group (**reconnect**, **delete**, or **unsure**), and details what was reconnected in the monitoring milestone.

---

## Feature Groups & Reconnection Recommendations

### 1. Monitoring, Spend & Portfolio Triage (Core Scope)
**Recommendation:** **reconnect** (Reconnected in this PR)
- **Rationale:** These screens provide core operator visibility across all client verticals: health probes (DNS/TLS/TTFB), the shared inference budget ledger, and the operator triage queue (approvals, P0 findings, live agents).
- **Files:**
  - `src/screens/Monitoring.tsx`: Observe / Health screen displaying synthetic probes, latencies, and status tripwires.
  - `src/screens/CostCenter.tsx`: Observe / Spend screen displaying weekly admission caps, tier allocations (60/30/10), and virtualized inference ledger.
  - `src/screens/Portfolio.tsx`: Home / Portfolio triage screen displaying approvals queue, P0 findings, and working agents.
  - `src/hooks/useCosts.ts`: Hook providing cost events and total spend calculations.
  - `src/hooks/useQA.ts`: Hook managing QA runs, test verdicts, and open P0 findings.
  - `src/lib/sharedStatus.ts`: State provider for weekly budget caps, admission rates, and status telemetry.
  - `src/lib/budget.ts`: Budget admission calculation, weekly limits, tier quotas, and rate admission rules.
  - `src/lib/cost.ts`: Provider pricing, model rates, cost event calculations, and token accounting.
  - `src/components/PlanApproval.tsx`: Card for inspecting and signing off agent execution plans.
  - `src/components/TaskDetailDrawer.tsx`: Flyout drawer for inspecting task details, logs, stepping, and actions.
  - `src/components/TaskExecutionStepper.tsx`: Vertical stepper rendering pipeline execution phases.
  - `src/lib/approvalLog.ts`: Audit log and local storage tracking for approval/rejection decisions.
  - `src/lib/designBrief.ts`: Gate check for design brief approval used during plan sign-off.
  - `src/data/designKitPresets.ts`: Domain presets referenced by design brief invariant checks.

---

### 2. PR #14 Design Brief Board & Slop Critic
**Recommendation:** **reconnect** (Deferred to subsequent PR per instructions)
- **Rationale:** Added in PR #14 (`geosan11/ui/step1-cleanup`), this subsystem enforces domain-specific vocabulary rules, anti-slop copy checks, and preset copy templates. Actively verified by `scripts/design-lint.ts`.
- **Files:**
  - `src/components/ReferenceBoard.tsx`: Design Kit reference board with preset selector, vocabulary deck, and real-time slop critic score.
  - `src/data/designKitTemplates.ts`: Component starter templates for domain archetypes.
  - `src/lib/slopCritic.ts`: Deterministic critic scoring interface copy against generic anti-patterns.
  - `src/lib/copyDeck.ts`: Domain noun dictionary, forbidden generic tokens ("user/item/dashboard"), and vocabulary gate.
  - `src/lib/goldenFixtures.ts`: Clean fixtures and adversarial fixtures for testing the critic.

---

### 3. AI Chat & Prompt Dock
**Recommendation:** **reconnect** (Deferred to subsequent PR)
- **Rationale:** Provides conversational agent interaction and prompt dispatching within project contexts. Currently bypassed in favor of the compact PromptDock in `ProjectDetail.tsx`.
- **Files:**
  - `src/components/ProjectChatTab.tsx`: Project detail chat tab interface.
  - `src/components/ChatComposer.tsx`: Input box with model selection, prompt submission, and token estimate.
  - `src/components/ChatMessageItem.tsx`: Chat bubble rendering markdown, agent thoughts, and code blocks.
  - `src/hooks/useChat.ts`: Chat conversation management and streaming response hook.

---

### 4. Proxy Client & Gateway Security
**Recommendation:** **reconnect** (Deferred until backend proxy integration is enabled in UI)
- **Rationale:** Connects the frontend to the local Express/MCP proxy server (`server.js`) with loopback security, token rotation, and learning store telemetry. Tested extensively by `server/proxySecurity.test.js`.
- **Files:**
  - `src/lib/proxyAuth.ts`: Proxy client token retrieval, loopback authorization headers, and session bridge.
  - `src/lib/llmLearningStore.ts`: In-memory and persisted learning store for LLM prompt corrections and anomaly logs.
  - `src/services/orchestrator.ts`: Background task scheduler and agent dispatch orchestrator.

---

### 5. Knowledge Vault
**Recommendation:** **reconnect** (Deferred to subsequent PR per instructions)
- **Rationale:** Screen for browsing engineering post-mortems, lessons learned, and system invariants.
- **Files:**
  - `src/screens/KnowledgeVault.tsx`: Knowledge base screen for engineering invariants and post-mortems.

---

### 6. SDLC Discovery & Agent Coordination
**Recommendation:** **reconnect** (Deferred to ProjectDetail multi-tab expansion)
- **Rationale:** Modules for 6-phase SDLC architecture discovery, task-to-model routing matrix matching task criticality to reasoning tiers, and agent completion cards. Tested by `scripts/full-system-test.ts`.
- **Files:**
  - `src/lib/sdlcDiscovery.ts`: 6-phase SDLC discovery engine, readiness calculation, and architecture blueprint generator.
  - `src/lib/modelRouter.ts`: Task-to-model routing matrix matching task criticality to pricing/reasoning capabilities.
  - `src/lib/supervisor.ts`: Supervisor handoff brief compiler and advisor prompt construction.
  - `src/components/ProposedTaskCard.tsx`: Card rendering proposed tasks generated by discovery/supervisor.
  - `src/components/AgentCompletionCard.tsx`: Card summarizing agent run completion metrics and diff summaries.
  - `src/components/AgentWorkingStream.tsx`: Live stream view of agent execution steps.
  - `src/components/session/TaskWorkspace.tsx`: Workspace view for active task execution.
  - `src/components/QAFindingRow.tsx`: Finding row for QA and security invariants (planned for Verify tab).

---

### 7. GitHub Integration & Codebase Analytics
**Recommendation:** **reconnect** (Deferred to Attach modal / Repo sync enhancement)
- **Rationale:** Modules handling GitHub REST API calls, branch synchronization, commit tracking, and repository structure analysis. Tested by `scripts/full-system-test.ts` and `scripts/smoke-tests.ts`.
- **Files:**
  - `src/lib/github.ts`: GitHub API client, URL parser, token redactor, and error hierarchy.
  - `src/services/githubSync.ts`: Repository synchronization state tracker and drift detector.
  - `src/components/GitHubRepoPicker.tsx`: Repo selection dropdown / input.
  - `src/components/RepoAnalyzer.tsx`: Codebase tree analyzer and archetype detector.
  - `src/lib/repoAnalysis.ts`: Repository structure parser and dependency extractor.
  - `src/data/githubRepos.ts`: Seed list of GitHub repositories.

---

### 8. Replaced Legacy Shell & Prototype Components
**Recommendation:** **delete**
- **Rationale:** These components were superseded by the cleaner, consolidated architecture introduced in `7793bfa` and `2baa37a` (`WorkshopSidebar`, `WorkshopProjectModal`, compact card architecture). They have no remaining callers or test dependencies.
- **Files:**
  - `src/components/SupabaseSidebar.tsx`: Superseded by `WorkshopSidebar.tsx`.
  - `src/components/TopBar.tsx`: Superseded by inline header chrome in screens.
  - `src/components/MobileNavBar.tsx`: Superseded by responsive collapsible sidebar.
  - `src/components/ProjectWizardModal.tsx`: Superseded by `WorkshopProjectModal.tsx`.
  - `src/components/NewTaskModal.tsx`: Replaced by ProjectDetail prompt dock and Runs create modal.
  - `src/components/HowToStartCards.tsx`: Superseded by streamlined empty state in `ProjectsScreen.tsx`.
  - `src/components/MCPSettings.tsx`: Consolidated into redesigned `Settings.tsx`.
  - `src/components/MultiAccountComponentHub.tsx`: Unused prototype component hub.
  - `src/components/ServiceLogos.tsx`: SVG logos used only by replaced wizard.
  - `src/components/SeverityBadge.tsx`: Superseded by standard `StatusPill.tsx` and stamp styles.

---

### 9. Test Fixtures, Harness Utilities & Types
**Recommendation:** **reconnect** / **unsure** (Keep test fixtures; consolidate legacy types)
- **Rationale:** Several files in `src` are imported exclusively by test suites and harness scripts (`scripts/full-system-test.ts`, `scripts/replay-budget.ts`, `node:test`). They should remain in the repository. `src/types/index.ts` is a legacy type file that should be consolidated with `src/lib/types.ts`.
- **Files:**
  - `src/data/initialData.ts`: Initial demo seed data (imported by `scripts/full-system-test.ts`) → **reconnect / keep**.
  - `src/lib/realtime.ts`: Realtime subscription handlers (imported by `scripts/full-system-test.ts` and `scripts/smoke-tests.ts`) → **reconnect / keep**.
  - `src/lib/signinLockdown.test.ts`: 48-assertion unit test suite for auth lockdown (executed via `tsx --test`) → **reconnect / keep**.
  - `src/types/index.ts`: Legacy types file (redundant with `src/lib/types.ts`) → **unsure / consolidate**.

---

## Summary of Reconnection in this PR

In this PR, only the monitoring domain has been reconnected and styled to match the calm dark palette (`#09090b` background, `#111113` cards, `border-white/[0.06]`, muted zinc typography, indigo primary accents):
1. **Portfolio Screen** (`src/screens/Portfolio.tsx`)
2. **Monitoring Screen** (`src/screens/Monitoring.tsx`)
3. **Cost Screen** (`src/screens/CostCenter.tsx`)
4. **WorkshopSidebar Navigation** (`src/components/WorkshopSidebar.tsx`) updated to route Portfolio, Monitoring, and Cost alongside Projects, Agents, and Settings.
5. **App Shell** (`src/App.tsx`) routes `portfolio`/`inbox`, `monitoring`, and `costs` to their respective screens.
6. **Supporting components and hooks** (`useQA`, `useCosts`, `sharedStatus`, `budget`, `cost`, `PlanApproval`, `TaskDetailDrawer`, `TaskExecutionStepper`, `approvalLog`, `designBrief`, `designKitPresets`) are now reachable.
