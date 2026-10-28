# GEOSAN Workshop — Supervisor Handoff Contract

This document defines the formal handoff contract between the **GEOSAN Workshop UI** and any autonomous **Supervisor / Orchestrator Agent**.

The contract is completely **implementation-agnostic**: it functions identically whether the Supervisor is executed by an **Antigravity CLI Agent**, an **xAI Grok Bot**, an **Anthropic Claude Coordinator**, a **Google Gemini Orchestrator**, or an external CI/webhook dispatcher.

---

## 1. UI Dispatch Payload (`SupervisorBrief`)

When a user initializes a project (via `+ New Project`) or attaches a pre-existing codebase (via `+ Attach Existing`), the UI generates and dispatches a structured brief:

```typescript
export interface SupervisorBrief {
  id: string;                                    // Unique project UUID
  name: string;                                  // Project display name
  goal: string;                                  // Core objective / user instructions
  archetype: string;                             // Archetype (e.g., 'Full-Stack App', 'Frontend Prototype')
  stack: string[];                               // Selected tech stack chips (e.g. ['React', 'Supabase', 'TypeScript'])
  deadline: string | null;                       // Optional target deadline ISO string
  enabled_providers: string[];                   // Permitted LLM providers (e.g. ['Claude', 'DeepSeek', 'GitHub'])
  source_type: 'template' | 'github' | 'external' | string; // Source repository origin
  source_ref: string | null;                     // GitHub owner/repo, clone URL, or local reference
  advisor_provider: string | null;               // Assigned advisor provider (e.g., 'Anthropic', 'Google', 'DeepSeek')
  advisor_agent_name: string | null;             // Assigned advisor role (e.g., 'ReviewAgent', 'CoordinatorAgent')
  progress: number;                              // Current percentage (0-100)
  next_step: string | null;                      // Description of immediate pending action
  created_at: string;                            // ISO 8601 timestamp
  status: string;                                // 'planning' | 'building' | 'testing' | 'production' | etc.
}
```

Helper function in `src/lib/supervisor.ts`:
```typescript
import { buildSupervisorBrief } from '@/lib/supervisor';

const brief = buildSupervisorBrief(project);
```

---

## 2. Supervisor Expected Responsibilities & Workflow

Upon receiving the `SupervisorBrief` (or detecting a newly created row in `projects`), the Supervisor is expected to carry out the following standard lifecycle actions:

### A. Initial Plan Synthesis (`action_type = 'plan'`)
The Supervisor must analyze the goal, archetype, and stack, and write the initial execution plan to the `project_logs` table:
- **`project_id`**: Current project ID
- **`agent_name`**: `Supervisor` (or orchestrator agent name)
- **`provider`**: Provider executing the Supervisor
- **`action_type`**: `'plan'`
- **`message`**: Human-readable summary (e.g., `"Synthesized 4-phase execution plan for Settlement Netting Engine"`)
- **`payload` (JSONB)**: Full plan structured as JSON and/or embedded markdown:
  ```json
  {
    "summary": "Implement bilateral settlement netting engine with RLS tenant isolation.",
    "phases": [
      { "name": "Architecture & Schema", "role": "ArchitectAgent", "status": "pending" },
      { "name": "Core Netting Calculation", "role": "CodingAgent", "status": "pending" },
      { "name": "Security & Invariant Audit", "role": "ReviewAgent", "status": "pending" },
      { "name": "Staging Deployment", "role": "DevOpsAgent", "status": "pending" }
    ],
    "markdown": "## Execution Plan\n1. Define BigInt arithmetic...\n2. Configure Supabase RLS..."
  }
  ```

### B. Agent Assignment Provisioning (`agent_assignments`)
The Supervisor must populate or update `agent_assignments` matching the enabled providers and project archetype:
- Set `role`: `Orchestrator`, `CodingAgent`, `ReviewAgent`, `ArchitectAgent`, etc.
- Set `agent_name`: Selected agent identifier
- Set `provider`: Enabled provider (`claude`, `deepseek`, `google`, `grok`, etc.)
- Set `status`: `'active'`, `'running'`, or `'idle'`
- Set `is_primary`: `true` for the primary executor

### C. Live State Propagation (`projects`)
As agents complete phases and invariants are checked, the Supervisor updates:
- **`projects.status`**: Advances from `'planning'` → `'building'` → `'testing'` → `'production'` / `'monitoring'`
- **`projects.progress`**: Monotonically advances percentage (0% → 100%)
- **`projects.next_step`**: Concisely summarizes the immediate next task (rendered directly in the project header and compact cards)
- **`projects.updated_at`**: Refreshed timestamp

### D. Structured Audit Logging (`project_logs`)
For each milestone, the Supervisor writes an entry with a `payload` JSONB object:
- **`assign`**: Agent role delegated to a provider/model
- **`code`**: AST synthesis or diff generation (payload should include `diff` string for in-UI diff rendering)
- **`review`**: Invariant audits, security checks, test execution verdicts
- **`deploy`**: Preview URL, commit hash, or staging release
- **`error`**: Regressions, timeout alerts, or failed invariant assertions
- **`advice`**: Strategic inputs logged by the assigned Advisor agent

### E. Strict Compliance with Pause State (`agent_assignments.status = 'paused'`)
The Workshop UI provides an operator override button:
- When the operator toggles **"Pause Agents"**, the UI updates `agent_assignments.status` to `'paused'`.
- The Supervisor and all dispatched sub-agents **MUST** immediately halt active token generations and suspend new task executions until the state changes back to `'active'` or `'working'`.

---

## 3. Advisor Boundary

The designated Advisor agent (`advisor_provider` / `advisor_agent_name`):
- Operates in a **read-only advisory role**.
- Submits entries to `project_logs` with `action_type = 'advice'`.
- **CANNOT** directly mutate `projects.status`, modify `agent_assignments`, or trigger staging deployments autonomously.
- Architectural, invariant, and cost advice can be reviewed by the Supervisor and Operator for incorporation into the plan.
