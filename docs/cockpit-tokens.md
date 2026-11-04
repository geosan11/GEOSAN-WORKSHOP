# Cockpit Token and Data Mapping

This document records the exact token and data mapping for the GEOSAN Engineering Cockpit (PR 1, PR 2 & PR 3).

## 1. Mock Colour → App Token Mapping

The mock (`/workspace/sd.html`) uses Obsidian dark mode hex values. The app translates these directly into semantic theme token utility classes that adapt cleanly to both Dark and Light themes without hardcoded hex values.

| UI Element / Mock Role | Mock Hex / Value | Dark Token / Class | Light Token / Class | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas / Background** | `#0a0a0a` / `#09090b` | `var(--bg-app)` (`#09090b`) / `bg-background` | `var(--bg-app)` (`#F3EEE6`) / `bg-background` | Cream default on light, obsidian near-black on dark |
| **Card Surface** | `#111113` | `var(--bg-card)` (`#111113`) / `bg-card` | `var(--bg-card)` (`#FFFCF7`) / `bg-card` | Standard card container background |
| **Elevated Surface / Popover** | `#161619` | `var(--bg-card-elevated)` (`#161619`) / `bg-popover` | `var(--bg-card-elevated)` (`#FFFFFF`) / `bg-popover` | Modals, elevated badges, tooltips |
| **Hairline Border** | `rgba(255, 255, 255, 0.06)` | `var(--border-app)` (`rgba(255, 255, 255, 0.06)`) / `border-border` | `var(--border-app)` (`rgba(17, 17, 17, 0.1)`) / `border-border` | Hairline dividing lines and card outlines |
| **Primary Text (Headings/Body)** | `#f4f4f5` (zinc-100) | `var(--text-main)` (`#f4f4f5`) / `text-foreground` | `var(--text-main)` (`#111111`) / `text-foreground` | Main high-contrast readable text |
| **Secondary Text (Labels/Meta)** | `#a1a1aa` (zinc-400) | `var(--text-muted)` (`#a1a1aa`) / `text-muted-foreground` | `var(--text-muted)` (`#6B6560`) / `text-muted-foreground` | Secondary labels, empty states, and metadata |
| **Accent / Brand** | `#6366f1` (indigo-500) | `var(--color-primary)` (`#6366f1`) / `text-primary` | `var(--color-primary)` (`#F0B230` / gold) / `text-primary` | Primary action highlights and indicators |
| **Accent Container / Tint** | `rgba(99, 102, 241, 0.12)` | `var(--accent)` (`rgba(99, 102, 241, 0.12)`) / `bg-accent` | `var(--accent)` (`rgba(240, 178, 48, 0.22)`) / `bg-accent` | Active sidebar pills, subtle container fills |
| **Status / Success** | `#10b981` (emerald-400) | `var(--color-success)` (`#10b981`) / `text-(--success-foreground)` | `var(--color-success)` (`#0F7A4A`) / `text-(--success-foreground)` | Success indicators and badges |
| **Warning** | `#f59e0b` (amber-400) | `var(--color-warning)` (`#F59E0B`) / `bg-(--warning)` / `text-(--warning-foreground)` | `var(--color-warning)` (`#B45309`) / `bg-(--warning)` / `text-(--warning-foreground)` | Progress bar warning state, demo mode badge |
| **Error / Destructive** | `#ef4444` (rose-500) | `var(--destructive)` (`#EF4444`) / `bg-destructive` / `text-destructive` | `var(--destructive)` (`#C62828`) / `bg-destructive` / `text-destructive` | Progress bar over-cap state, error badges |

---

## 2. Data Sources & Empty State Mapping

Every tile and section derives view models through pure selectors in `src/lib/cockpitModel.ts`. No mock or invented numbers are permitted.

| Tile / Section | Field(s) | Hook / Function Source | Empty / Fallback State | Status in PR 3 |
| :--- | :--- | :--- | :--- | :--- |
| **Top Bar — Project Name** | `project.name` | `useProjects()` → `topBarModel()` | `"Cockpit"` | Reads first project; falls back to `"Cockpit"` |
| **Top Bar — Repository** | `project.github_repo_url` or `project.repo_url` | `useProjects()` → `topBarModel()` | `null` (badge omitted if no repo configured) | Parses HTTPS, SSH, owner/repo |
| **Top Bar — Environment Pill** | `isDemoMode` | `src/lib/supabase` → `topBarModel()` | `"Supabase"` vs `"Demo mode"` | Built in PR 1 |
| **Top Bar — Proxy Chip** | `proxyState` | `cockpitProbe.ts` (`shouldProbeProxy` + `probeProxy`) → `topBarModel()` | `"Proxy disabled"`, `"Checking proxy…"`, `"Proxy unreachable"`, `"Proxy refused (sign in as owner / repo not assigned)"`, `"Proxy connected"` | Built in PR 2 (dev-only probe: runs when `isDev`, `proxyUrlConfigured`, or hostname loopback) |
| **Integrations: Spend this week** | `costEvent.cost_usd`, `costEvent.created_at`, `budget.totalCapUsd` | `useCosts()` + `useSharedStatus()` (`statusData.budget.totalCapUsd`) → `spendTileModel()` | `"No spend recorded this week"`, with `"Cap $y.yy"` when cap exists | Built in PR 2: `$x.xx / $y.yy` with thin progress bar (ok: `bg-primary`, warn: `bg-(--warning)`, over: `bg-destructive`), `role="progressbar" aria-valuenow/max`. In-tile `QueryError` on costs error. |
| **Integrations: AI providers** | `costEvent.provider`, `costEvent.model` | `useCosts()` → `providersTileModel()` | `"No AI providers used yet"` | Built in PR 2: chips capped at 6 + `"+N more"`. In-tile `QueryError` on costs error. |
| **Integrations: Database** | `isDemoMode`, `connectionError` | `src/lib/supabase` + `useProjects().error` → `databaseTileModel()` | `"Connected"` / `"Demo mode (no Supabase)"` / `"Connection error"` | Built in PR 2: `connectionError` receives projects query error. No full-screen early return on query error. |
| **Integrations: GitHub** | `proxyState`, `latestCommit` | `cockpitProbe.ts` (`probeProxy`) → `githubTileModel()` | `"Connect the local proxy to see the latest commit"` | Built in PR 2 (renamed from GitHub CI): shows latest commit (`sha7 · message · relative date`) when reachable; muted footnote `"CI runs aren't available through the proxy yet."` (Actions runs excluded from proxy allowlist). |
| **Agents Section** | `task.assigned_agent`, `task.status`, `task.goal`, `task.prompt`, `task.task_type`, `task.branch_name`, `task.pr_url`, `task.started_at`, `task.created_at`, `qaRun.task_id`, `qaRun.status`, `qaRun.created_at` | `useTasks()` + `useQA()` → `agentsModel()` | `"No active agent tasks"` with `"Open Agents"` link-button navigating to `{ kind: 'runs' }` | Built in PR 3: responsive grid (1 col @ 360px, 2 col sm, 3 col lg) of `AgentCard`s. Cards are keyboard-accessible button cards (`role="button"`, `tabIndex 0`, Enter/Space) opening `TaskDetailDrawer` with real task lookup & approval actions. In-section `QueryError` on tasks error. |
| **Activity Section** | `project_logs`, agent events | Realtime activity feed (PR 4) | `"No activity recorded yet"` | Placeholder in PR 1; activity feed planned for PR 4 |

---

## 3. Agent Fleet Specifications (PR 3)

The Agent Fleet section models real non-terminal agent tasks grouped by agent without hard-coding agent roles or inventing metrics.

- **Grouping & Real Roles**: Grouped by real `task.assigned_agent` (null, whitespace, or missing maps to `"Unassigned"`). Only non-terminal tasks (`queued`, `running`, `awaiting_approval`) form agent cards. If an agent has only terminal tasks (`done`, `failed`, `cancelled`), no card is rendered.
- **Status Rule**: Exactly one of `'running'` | `'awaiting_approval'` | `'queued'` determined by priority:
  1. `running` (if `counts.running > 0`)
  2. `awaiting_approval` (else if `counts.awaiting_approval > 0`)
  3. `queued` (otherwise)
  Status badge variants: `running` → `primary`, `awaiting_approval` → `warning`, `queued` → `outline`.
- **Current Task Selection**:
  - For running agent: newest running task by `started_at` (fallback to `created_at`).
  - For awaiting approval agent: oldest awaiting task by `created_at`.
  - For queued agent: oldest queued task by `created_at`.
  - Title: `task.goal` if non-empty, else first line of `task.prompt`, capped at 90 characters.
  - Timestamp: `sinceIso` uses `started_at` for running tasks, else `created_at`.
- **QA Link Rule**: The newest `qaRun` by `created_at` whose `task_id` matches any task of this agent (active or terminal). If no match or `task_id` is null/unrelated, `lastQa` is `null`. A QA verdict is never attached without a verified `task_id` match.
- **Sorting Order**: Running cards first, then awaiting approval, then queued, then sorted alphabetically by agent name.
- **Anti-Slop & Truth In Telemetry**: `agent_tasks` has no heartbeat, ping, CPU, memory, or progress percentage fields. The UI explicitly avoids the words "alive", "heartbeat", "CPU", "MEM", or progress bars/percentages. All status labels use real states ("Running", "Awaiting approval", "Queued").
- **Interaction & Drawer**: Cards act as accessible buttons (`role="button"`, `tabIndex 0`, Enter/Space activation, visible focus ring) with `aria-label="Open task <title> for <agent>"`. Clicking opens `TaskDetailDrawer` with approval actions (`onApprove`, `onReject`, `onCancel`, `onRetry`). PR link opens in new tab with `rel="noopener noreferrer"` without triggering the card drawer.

