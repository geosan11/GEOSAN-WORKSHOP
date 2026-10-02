# Development & AI Collaboration Rules - GEOSAN-WORKSHOP

## 1. Core Operating Principles

### 1.1 Zero Hallucination & Strict Spec Compliance
- All code generation, refactoring, and feature additions MUST adhere strictly to `docs/PRD.md` and `docs/ARCHITECTURE.md`.
- Never invent unapproved database columns, endpoints, or unrequested features. If a requirement is ambiguous, refer to `docs/RULES.md` and `docs/MEMORY.md`.

### 1.2 Minimal File Touch & Atomic Commits
- Make surgical, scoped edits. Never reformat, rename, or touch files unrelated to the active task.
- Clean code only: no dead code, unused commented-out blocks, or temporary debugging statements left behind.

### 1.3 Dependency Discipline
- Never install external packages without explicit necessity.
- Prefer existing lightweight utilities, standard React hooks, and Tailwind CSS.
- When an icon is needed, use `lucide-react`.

---

## 2. Technology & Coding Standards

### 2.1 TypeScript Strictness
- `noImplicitAny: true` is strictly enforced.
- **Zero `any` types:** Use explicit interfaces, union types, or `unknown` with type guards.
- Explicit return types are required on all hooks, API utilities, and service functions.
- Domain models must be declared in `src/lib/types.ts`.

### 2.2 Framework & Component Architecture
- React functional components with named exports or standard constants.
- State management: Use specialized React context providers (`DensityProvider`, `AuthProvider`, `DataProvider`, `ToastProvider`) rather than bloated global stores.
- Separation of concerns: Pure calculations (e.g., FinOps burn calculus) belong in `src/lib/`, UI in `src/components/`, and composite views in `src/screens/`.

### 2.3 Progressive Disclosure Pattern
- All expandable UI surfaces MUST implement the Addendum C Progressive Disclosure standard:
  - Three visual variants: `'row'`, `'card'`, `'section'`.
  - Smooth 200ms height transitions using CSS Grid (`grid-rows-[0fr]` to `grid-rows-[1fr]`).
  - State persistence under `ehi.disclosure.${persistKey}` in `localStorage`.
  - ARIA attributes: `aria-expanded`, `aria-controls`, and `aria-labelledby`.
  - Full keyboard accessibility: `Enter` / `Space` toggles trigger, `Escape` collapses region.

### 2.4 Styling & Design Tokens
- Pure Tailwind CSS utility classes only; **no inline `style={{ ... }}` objects** (except dynamic virtualization offsets).
- Follow the Geosan dark obsidian palette:
  - Gold Accent: `#F0B230` / `#FFBD59`
  - Obsidian Surface: `#0d1117` (App bg), `#161b22` (Card surface), `#1c2333` (Elevated surface)
  - Text: `#e6edf3` (Primary), `#8b98a8` (Secondary / Muted)
- High contrast focus rings: `focus-visible:ring-2 focus-visible:ring-[#F0B230]`.

---

## 3. Repository Structure & Naming Conventions

### 3.1 Naming Rules
- **React Components:** PascalCase (e.g., `TaskDisclosureRow.tsx`, `PlanApproval.tsx`).
- **Hooks:** camelCase with `use` prefix (e.g., `useProjects.ts`, `useDensity.tsx`).
- **Utilities & Logic:** camelCase (e.g., `cost.ts`, `format.ts`).
- **Types & Interfaces:** PascalCase (e.g., `AgentTask`, `ProjectStatus`).
- **Constants:** UPPER_SNAKE_CASE (e.g., `TASK_TYPES`, `INITIAL_NOTIFICATIONS`).

### 3.2 Directory Boundaries
- Atomic UI elements $\to$ `src/components/`
- Progressive disclosure components $\to$ `src/components/disclosure/`
- Full page view containers $\to$ `src/screens/`
- Shared data types & helpers $\to$ `src/lib/`

---

## 4. Agent Guardrails & Task Handoff Protocol

### 4.1 Single-Task Execution Boundary
- When working on an issue, find the active task flagged `[IN_PROGRESS]` in `docs/TASKS.md`.
- Execute only that task. Do not jump ahead to future phases.

### 4.2 Verification & Linting Gate
- After making edits, always run verification:
  1. `lint_applet` (checks for TypeScript compiler errors and syntax violations).
  2. `compile_applet` (validates complete build artifact creation).
- Zero tolerance for unresolved TypeScript compilation errors.

### 4.3 Documentation Synchronization
- Upon successful verification of a task:
  1. Update `docs/TASKS.md`: Mark task status as `[DONE]`.
  2. Update `docs/MEMORY.md`: Record any architectural decision or key constraint identified.
