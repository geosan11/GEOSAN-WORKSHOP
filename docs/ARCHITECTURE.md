# System Architecture - GEOSAN-WORKSHOP

## 1. High-Level System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GEOSAN-WORKSHOP CLIENT                             │
│       React 19 / Vite SPA · Tailwind CSS · Progressive Disclosure (L0-L2)   │
│       Density Engine (Compact | Normal | Expanded) · Web Audio Telemetry    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATION & GATEWAY LAYER                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         CoordinatorAgent                            │   │
│   │         Task Router · Worktree Daemon · DAG Execution Engine        │   │
│   └──────┬───────────────────┬───────────────────┬───────────────────┬──┘   │
│          │                   │                   │                   │      │
│          ▼                   ▼                   ▼                   ▼      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│   │ CodingAgent  │    │ ReviewAgent  │    │   QAAgent    │    │DeployAgnt│  │
│   │(Gemini/Claude│    │(Sonnet Critic│    │(Schemathesis │    │ (Vercel  │  │
│   │  Synthesis)  │    │ Invariants)  │    │  DOM Crawl)  │    │ Preview) │  │
│   └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA & PERSISTENCE LAYER                            │
│  PostgreSQL / Supabase (RLS Isolated) · FinOps Ledger · LocalStorage Cache  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Technology Stack & Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Runtime & Bundler** | Vite + React 19 + TypeScript | Instant HMR, minimal footprint, strict type checking across all client boundaries. |
| **Styling & Design** | Tailwind CSS + Lucide Icons | Utility-first styling with Geosan tokens (Gold `#F0B230`, Obsidian `#0d1117`, Navy `#084985`). |
| **Progressive Disclosure** | Addendum C Custom Engine | Smooth CSS Grid 200ms transitions, `ehi.disclosure.${persistKey}` persistence, zero external heavy accordion dependencies. |
| **State & Navigation** | Context + Local Storage Sync | Fast client-side navigation with URL / hash synchronization and offline session resilience. |
| **FinOps Attribution** | Client-side cost calculus | Computes token spend by provider (Gemini, Claude, DeepSeek, OpenAI) against monthly budgets. |
| **Testing & Invariants** | Schemathesis + TypeScript strict | Contract verification of REST endpoints and strict compile-time invariants. |

---

## 3. Repository Directory Structure

```text
/
├── docs/
│   ├── PRD.md                   # Product requirements & boundaries
│   ├── ARCHITECTURE.md          # System architecture, schemas, and API flow
│   ├── RULES.md                 # Non-negotiable coding and AI agent standards
│   ├── DESIGN.md                # Design tokens, typography, and UI rules
│   ├── TASKS.md                 # Numbered checklist and roadmap
│   └── MEMORY.md                # Persistent architectural decisions (ADRs)
├── src/
│   ├── components/              # Shared atomic and composite UI components
│   │   ├── disclosure/          # Base Disclosure, TaskDisclosureRow, ProjectDisclosureCard
│   │   ├── PlanApproval.tsx     # Adversarial review gate widget
│   │   ├── TaskExecutionStepper.tsx # 7-step pipeline visualizer
│   │   ├── PendingActionsBar.tsx# Triage bar for approvals and QA findings
│   │   └── TopBar.tsx           # Navigation, notifications, density switch
│   ├── data/                    # Seed and reference fixture data
│   ├── hooks/                   # Reactive state hooks (useProjects, useTasks, useCosts, useQA)
│   ├── lib/                     # Core business logic, types, cost calculus, and density
│   │   ├── types.ts             # Strict domain TypeScript models
│   │   ├── density.tsx          # Density context and storage engine
│   │   ├── cost.ts              # FinOps calculation utilities
│   │   └── dataProvider.ts      # Multi-tenant data access abstraction
│   ├── screens/                 # Full view containers
│   │   ├── Portfolio.tsx        # Multi-vertical bird's-eye view
│   │   ├── ProjectDetail.tsx    # Vertical detail, tasks, QA, and settings
│   │   ├── AgentConsole.tsx     # 3-step structured instruction dispatcher
│   │   ├── CostCenter.tsx       # FinOps analytics and budget thresholds
│   │   ├── QARuns.tsx           # Autonomous QA run log & findings workbench
│   │   └── Settings.tsx         # Platform governance and agent configurations
│   ├── App.tsx                  # Root shell with providers
│   ├── index.css                # Global Tailwind design tokens
│   └── main.tsx                 # Entrypoint
├── package.json
└── tsconfig.json
```

---

## 4. Database Schema & Data Models

### 4.1 `organizations`
- `id` (text, PK): e.g., `'org-geosan-global'`
- `name` (text, NOT NULL): Organization display name
- `slug` (text, UNIQUE): URL-friendly slug
- `created_at` (timestamptz)

### 4.2 `projects` (Client Verticals)
- `id` (text, PK): e.g., `'proj-ehi-multi'`
- `org_id` (text, FK $\to$ `organizations.id`): Tenant isolation key
- `name` (text, NOT NULL)
- `slug` (text, NOT NULL)
- `vertical` (text, NOT NULL): Healthcare, Oil & Gas, Aviation, IoT Fleet
- `repo_url` (text)
- `vercel_deployment_url` (text)
- `status` (text): `'planning' | 'building' | 'testing' | 'production' | 'monitoring' | 'archived'`
- `health_status` (text): `'healthy' | 'degraded' | 'down'`
- `monthly_budget_usd` (numeric, default 500)
- `agent_instructions` (text)
- `git_branch` (text, default `'main'`)
- `updated_at` (timestamptz)

### 4.3 `tasks` (Agent Work Units)
- `id` (text, PK): e.g., `'task-284'`
- `org_id` (text, FK $\to$ `organizations.id`)
- `project_id` (text, FK $\to$ `projects.id`)
- `task_type` (text): `'BUILD_FEATURE' | 'FIX_BUG' | 'QA_SECURITY' | 'DEPLOY' | etc.`
- `prompt` (text, NOT NULL)
- `status` (text): `'proposed' | 'queued' | 'running' | 'awaiting_approval' | 'done' | 'failed' | 'blocked'`
- `assigned_agent` (text): `'CoordinatorAgent' | 'CodingAgent' | 'ReviewAgent' | 'QAAgent'`
- `plan` (jsonb): Structured steps, file touch paths, invariant checks
- `result` (jsonb): Worktree output, exit code, diff summary
- `branch_name` (text): Git worktree branch
- `pr_url` (text)
- `cost_usd` (numeric)
- `created_at` (timestamptz)
- `completed_at` (timestamptz)

### 4.4 `cost_events` (FinOps Attribution)
- `id` (text, PK)
- `org_id` (text, NOT NULL)
- `project_id` (text, NOT NULL)
- `task_id` (text, FK $\to$ `tasks.id`)
- `model_name` (text): `'gemini-2.5-flash' | 'claude-sonnet-4' | 'deepseek-r1' | etc.`
- `provider` (text): `'google' | 'anthropic' | 'deepseek' | 'openai'`
- `tokens_input` (integer)
- `tokens_output` (integer)
- `cost_usd` (numeric, NOT NULL)
- `timestamp` (timestamptz)

### 4.5 `qa_findings` (Vulnerability & Bug Registry)
- `id` (text, PK)
- `project_id` (text, NOT NULL)
- `task_id` (text)
- `severity` (text): `'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'`
- `title` (text, NOT NULL)
- `description` (text)
- `endpoint` (text)
- `status` (text): `'open' | 'resolved' | 'acknowledged'`
- `created_at` (timestamptz)

---

## 5. Authentication & Authorization Flow
- **Tenant Isolation:** Every database query MUST filter by `org_id`.
- **Role Hierarchy:**
  1. `SuperAdmin`: Manage billing, add projects, override approval gates.
  2. `Operator`: Dispatch instructions, review adversarial plans, sign off on PRs.
  3. `Auditor`: Read-only access to FinOps telemetry and QA logs.
- **Client Security:** API tokens for third-party LLMs never reside in client bundles; requests route through server proxies or authorized runner tasks.

---

## 6. API Design & Data Flow

```text
[Operator Interface] 
        │ (1) Dispatch Task
        ▼
[CoordinatorAgent] ──> (2) Fork git worktree (isolation)
        │
        ▼ (3) Request Plan
[ReviewAgent (Claude Sonnet)] ──> Validates invariants & security
        │
        ▼ (4) Set status: awaiting_approval
[Operator Approval Gate] ──> Operator clicks "Approve PR"
        │
        ▼ (5) Execute Coding & QA Suite
[CodingAgent + QAAgent] ──> Synthesize code, run Schemathesis tests
        │
        ▼ (6) Open PR / Deploy
[DeployAgent] ──> Deploy to Vercel Preview
```

---

## 7. Third-Party Integrations & Environment Variables

```bash
# Runtime Environment Variables (.env.example)
VITE_APP_NAME="GEOSAN-WORKSHOP AetherOrch Command Center"
VITE_ENABLE_MOCK_DATA="false"

# Server-Side Provider Endpoints (Proxied)
GEMINI_API_KEY=""
ANTHROPIC_API_KEY=""
DEEPSEEK_API_KEY=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
```
