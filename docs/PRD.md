# Product Requirements Document (PRD) - GEOSAN-WORKSHOP

## 1. Document Control
- **Document Version:** 1.0.0
- **Date:** October 1, 2026
- **Author:** Geosan Production Architecture Core
- **Status:** APPROVED & BASELINED
- **Target MVP:** v1.0 Production Release

---

## 2. Product Overview & Vision
`GEOSAN-WORKSHOP` (AetherOrch Command Center) is an enterprise-grade multi-agent autonomous engineering command center and operations hub. It provides human operators with centralized oversight, task dispatching, adversarial code verification, FinOps budget governance, and continuous QA telemetry across four managed enterprise verticals:
1. **EHI Multisystems** (Healthcare / Enterprise ERP & Debt Reconciliation)
2. **Iyanuoluwa Oil & Gas** (Supply Chain & Automated Weighbridge Invoicing)
3. **Aviation Log Entry** (Electronic Flight Bag & Compliance Engine)
4. **EdgePoint Mesh** (Distributed IoT Sensor Node Fleet)

The product vision is zero-drift autonomous software engineering: autonomous specialist agents (`CodingAgent`, `ReviewAgent`, `QAAgent`, `DeployAgent`) execute verified tasks inside isolated git worktrees, guarded by mandatory human-in-the-loop plan approvals and real-time FinOps hard-stop thresholds.

---

## 3. Problem Statement & Opportunity
- **Context Fragmentation:** Managing disparate microservices across different enterprise verticals leads to inconsistent coding practices, undetected schema regressions, and unmonitored LLM token burn.
- **Agent Hallucination & Runaway Deployments:** Unguarded autonomous agents create untested pull requests and push breaking database migrations without schema invariant checks.
- **FinOps Blind Spots:** Without token attribution per prompt and project, agentic execution costs spiral uncontrollably.
- **Opportunity:** A unified operator cockpit delivering three levels of progressive disclosure (L0 Ambient, L1 Focus, L2 Deep) with strict adversarial validation (Claude Sonnet reviewer + Schemathesis contract tests) before deployment.

---

## 4. User Personas & Core Workflows

### 4.1 Personas
1. **Staff Operations Engineer (Operator):** Dispatches multi-step features, reviews adversarial execution plans, and executes human approval gates.
2. **FinOps Auditor:** Monitors burn rates across LLM providers (Gemini, Claude, DeepSeek, OpenAI) and configures hard-stop budget ceilings.
3. **Security & QA Officer:** Inspects OWASP test runs, API contract violations, and tenant Row-Level Security (RLS) isolation.

### 4.2 Core Workflows
1. **Instruction Dispatch Workflow:**
   - Operator selects target vertical (e.g., EHI Multisystems) $\to$ Chooses task type (`BUILD_FEATURE`, `FIX_BUG`, `QA_SECURITY`, `DEPLOY`) $\to$ Submits natural language prompt $\to$ CoordinatorAgent spawns isolated worktree and drafts structured DAG plan.
2. **Adversarial Plan Approval Gate:**
   - ReviewAgent (Claude Sonnet 4) validates plan $\to$ System transitions task to `awaiting_approval` $\to$ Operator reviews diff & invariant checklist in `PlanApproval` $\to$ One-click Approve PR or Reject with feedback.
3. **Continuous Progressive Disclosure:**
   - Operator switches between `Compact`, `Normal`, and `Expanded` density modes $\to$ Disclosures retain state per `ehi.disclosure.${persistKey}` in `localStorage`.

---

## 5. Key Goals & Success Metrics (KPIs)
- **Zero Invariant Breakages:** 100% of generated pull requests pass Schemathesis contract checks and tenant RLS verification.
- **Cost Predictability:** 100% of LLM calls attributed to an `org_id` and `project_id`; zero overrun past configured monthly budgets.
- **Operator Latency:** Under 5 seconds from task dispatch to worktree isolation and plan draft generation.
- **UI Responsiveness:** 60fps render performance, sub-200ms layout expansion, and zero hydration layout shifts.

---

## 6. Feature Scope

### 6.1 Must Have (MVP v1.0)
- **Multi-Tenant Vertical Portfolio:** Real-time health indicators, monthly spend, and progressive disclosure cards for the 4 verticals.
- **Three-Step Guided Dispatcher:** Visual vertical selector, specialist agent routing, and preset prompt chips.
- **Adversarial Approval Gate:** Interactive plan approval widget with diff view and operator sign-off.
- **FinOps Spend Dashboard:** Live daily burn charts, provider breakdown (Gemini, Anthropic, OpenAI, DeepSeek), and budget threshold tracking.
- **QA Autonomous Workbench:** Test run telemetry, severity badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), and OWASP/contract findings audit.
- **Progressive Disclosure & Density Switch:** Three-mode density toggle (`Compact` | `Normal` | `Expanded`) with local storage persistence.

### 6.2 Should Have (v1.1)
- Live WebSocket streaming logs directly from runner containers.
- Interactive schema diff visualizer for Supabase / PostgreSQL migrations.
- Direct GitHub PR webhook merge triggers from the approval drawer.

### 6.3 Out of Scope / Non-Goals
- Real-world production credential storage in client code (mock/proxy routing only).
- Unrestricted public multi-tenant signup (strictly gated enterprise single-tenant or RBAC access).
- Autonomous git push directly to `main` without human approval.

---

## 7. Edge Cases & Error Handling Criteria
- **Provider API Quota Exhaustion:** Automatic fallback routing to secondary provider models without dropping task state.
- **Worktree Merge Conflicts:** Mark task status as `blocked`, trigger operator notification in top bar, and generate automatic conflict remediation plan.
- **Local Storage Quota Exceeded:** Graceful try/catch fallback to in-memory state without crashing UI components.
- **Network Interruption During Dispatch:** Idempotency key assigned to every task prompt to prevent duplicate run creation.
