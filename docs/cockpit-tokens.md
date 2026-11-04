# Cockpit Token and Data Mapping

This document records the exact token and data mapping for the GEOSAN Engineering Cockpit (PR 1 & PR 2).

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

| Tile / Section | Field(s) | Hook / Function Source | Empty / Fallback State | Status in PR 2 |
| :--- | :--- | :--- | :--- | :--- |
| **Top Bar — Project Name** | `project.name` | `useProjects()` → `topBarModel()` | `"Cockpit"` | Reads first project; falls back to `"Cockpit"` |
| **Top Bar — Repository** | `project.github_repo_url` or `project.repo_url` | `useProjects()` → `topBarModel()` | `null` (badge omitted if no repo configured) | Parses HTTPS, SSH, owner/repo |
| **Top Bar — Environment Pill** | `isDemoMode` | `src/lib/supabase` → `topBarModel()` | `"Supabase"` vs `"Demo mode"` | Built in PR 1 |
| **Top Bar — Proxy Chip** | `proxyState` | `cockpitProbe.ts` (`shouldProbeProxy` + `probeProxy`) → `topBarModel()` | `"Proxy disabled"`, `"Checking proxy…"`, `"Proxy unreachable"`, `"Proxy refused (sign in as owner / repo not assigned)"`, `"Proxy connected"` | Built in PR 2 (dev-only probe: runs when `isDev`, `proxyUrlConfigured`, or hostname loopback) |
| **Integrations: Spend this week** | `costEvent.cost_usd`, `costEvent.created_at`, `budget.totalCapUsd` | `useCosts()` + `useSharedStatus()` (`statusData.budget.totalCapUsd`) → `spendTileModel()` | `"No spend recorded this week"`, with `"Cap $y.yy"` when cap exists | Built in PR 2: `$x.xx / $y.yy` with thin progress bar (ok: `bg-primary`, warn: `bg-(--warning)`, over: `bg-destructive`), `role="progressbar" aria-valuenow/max`. In-tile `QueryError` on costs error. |
| **Integrations: AI providers** | `costEvent.provider`, `costEvent.model` | `useCosts()` → `providersTileModel()` | `"No AI providers used yet"` | Built in PR 2: chips capped at 6 + `"+N more"`. In-tile `QueryError` on costs error. |
| **Integrations: Database** | `isDemoMode`, `connectionError` | `src/lib/supabase` + `useProjects().error` → `databaseTileModel()` | `"Connected"` / `"Demo mode (no Supabase)"` / `"Connection error"` | Built in PR 2: `connectionError` receives projects query error. No full-screen early return on query error. |
| **Integrations: GitHub** | `proxyState`, `latestCommit` | `cockpitProbe.ts` (`probeProxy`) → `githubTileModel()` | `"Connect the local proxy to see the latest commit"` | Built in PR 2 (renamed from GitHub CI): shows latest commit (`sha7 · message · relative date`) when reachable; muted footnote `"CI runs aren't available through the proxy yet."` (Actions runs excluded from proxy allowlist). |
| **Agents Section** | `task.assigned_agent`, `task.status` | `useTasks()` → `agentsModel()` | `"No active agent tasks"` | Active task/agent count; in-section `QueryError` on tasks error (cards in PR 3) |
| **Activity Section** | `project_logs`, agent events | Realtime activity feed (PR 4) | `"No activity recorded yet"` | Placeholder in PR 1; activity feed planned for PR 4 |
