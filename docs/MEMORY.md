# Project Memory & Session State - GEOSAN-WORKSHOP

## Current System State
- **Active Phase:** Phase 4 (Core MVP Features) & Phase 5 (Verification)
- **Active / In Progress Task:** Task 4.6 (Autonomous QA Workbench Telemetry Refinement)
- **Immediate Next Task:** Task 5.1 (Full TypeScript strict verification across all modules)

---

## Key Architectural Decisions (ADR Log)

### ADR 001: 2026-09-29 - Progressive Disclosure Architecture (Addendum C)
- **Context:** Large enterprise dashboards suffer from information overload when presenting deep multi-tenant telemetry and multi-agent execution plans.
- **Decision:** Implemented a unified `Disclosure` primitive supporting `'row'`, `'card'`, and `'section'` variants. Height transition uses pure CSS Grid (`grid-rows-[0fr]` $\to$ `grid-rows-[1fr]`) over 200ms ease-out. State is persisted in `localStorage` under `ehi.disclosure.${persistKey}` as `{ open: boolean, at: number }`.
- **Status:** APPROVED & DEPLOYED.

### ADR 002: 2026-09-29 - Density Engine Integration
- **Context:** Operators on desktop workstations need data-dense tables, while mobile operators require concise high-contrast cards.
- **Decision:** Built `DensityProvider` with three modes: `'compact'`, `'normal'`, and `'expanded'`. Stored in `localStorage` under `ehi.density` and broadcasted via `StorageEvent` so all disclosures re-evaluate in real time.
- **Status:** APPROVED & DEPLOYED.

### ADR 003: 2026-09-30 - Multi-Model Federation Strategy
- **Context:** Avoiding vendor lock-in and single-model blind spots.
- **Decision:** 
  - **Google Gemini (AI Studio):** Global repository architect, spec author, massive context master (1M+ tokens).
  - **Claude Sonnet 4:** Adversarial code critic, invariant auditor, and mandatory PR sign-off reviewer.
  - **DeepSeek R1 / V3:** Complex algorithmic logic and FinOps accounting calculus.
  - **Antigravity / Local IDE:** Autonomous file synthesis in isolated git worktrees.
  - **Grok 3:** Fast edge-case debugging and second-opinion fuzzer.
- **Status:** APPROVED & BASELINED.

---

## Known Constraints, Quirks & Technical Debt
1. **Local Storage Private Browsing Mode:** In strict private/incognito windows, `localStorage` can throw SecurityErrors. All calls are safely wrapped in try/catch blocks with in-memory fallbacks.
2. **Worktree Virtualization:** Large task feeds with animated disclosures use CSS Grid rather than fixed-height virtual rows to prevent jumpy layout shifts during expansion.
3. **No Direct Production Commits to Main:** All automated code generation must route to an isolated git branch (`agent/task-...`) and receive operator approval before merging.

---

## Environment Variables Register

| Variable Name | Required In | Purpose | Default / Example |
| :--- | :--- | :--- | :--- |
| `VITE_APP_NAME` | Dev, Prod | Display title in browser header and metadata | `"GEOSAN-WORKSHOP AetherOrch"` |
| `VITE_ENABLE_MOCK_DATA` | Dev | Toggles fixture mode vs live API proxy | `"true"` (Dev), `"false"` (Prod) |
| `GEMINI_API_KEY` | Server | Backend coordinator LLM synthesis | Server-only secret |
| `ANTHROPIC_API_KEY`| Server | Backend adversarial code review critic | Server-only secret |
| `SUPABASE_URL` | Server | PostgreSQL multi-tenant database endpoint | Cloud URL |

---

## Session Handoff Notes
- Initialized complete spec-driven development documentation suite (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RULES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/MEMORY.md`).
- Progressive disclosure engine (`Disclosure.tsx`, `TaskDisclosureRow.tsx`, `ProjectDisclosureCard.tsx`) and 3-mode density engine are fully operational and verified.
- Codebase is ready for Phase 5 verification and git commit.
