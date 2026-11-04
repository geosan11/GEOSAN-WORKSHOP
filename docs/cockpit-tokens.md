# Cockpit Token and Data Mapping

This document records the exact token and data mapping for the GEOSAN Engineering Cockpit (PR 1 foundation).

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
| **Warning** | `#f59e0b` (amber-400) | `var(--color-warning)` (`#F59E0B`) / `text-(--warning-foreground)` | `var(--color-warning)` (`#B45309`) / `text-(--warning-foreground)` | Demo mode badge and non-fatal warnings |
| **Error / Destructive** | `#ef4444` (rose-500) | `var(--destructive)` (`#EF4444`) / `text-destructive` | `var(--destructive)` (`#C62828`) / `text-destructive` | Error states and broken connections |

---

## 2. Data Sources & Empty State Mapping

Every tile and section derives view models through pure selectors in `src/lib/cockpitModel.ts`. No mock or invented numbers are permitted.

| Tile / Section | Field(s) | Hook / Function Source | Empty / Fallback State | Status in PR 1 |
| :--- | :--- | :--- | :--- | :--- |
| **Top Bar — Project Name** | `project.name` | `useProjects()` → `topBarModel()` | `"Cockpit"` | Built in PR 1 (reads first project) |
| **Top Bar — Repository** | `project.github_repo_url` or `project.repo_url` | `useProjects()` → `topBarModel()` | `null` (badge omitted if no repo configured) | Built in PR 1 (parses HTTPS, SSH, owner/repo) |
| **Top Bar — Environment Pill** | `isDemoMode` | `src/lib/supabase` → `topBarModel()` | `"Supabase"` vs `"Demo mode"` | Built in PR 1 |
| **Top Bar — Proxy Chip** | `proxyState` | Screen parameter (`'disabled'`) → `topBarModel()` | `"Proxy disabled"` | Built in PR 1 (network probe not wired yet; PR 1 passes `'disabled'`) |
| **Integrations: Spend this week** | `costEvent.cost_usd`, `costEvent.created_at` | `useCosts()` + `getIsoWeekKey()` → `spendTileModel()` | `"No spend recorded this week"` | PR 1 shows the weekly total when there is data; cap/progress in PR 2 |
| **Integrations: AI providers** | `costEvent.provider`, `costEvent.model` | `useCosts()` → `providersTileModel()` | `"No AI providers used yet"` | PR 1 shows model/provider chips when there is data |
| **Integrations: Database** | `isDemoMode`, `connectionError` | `src/lib/supabase` → `databaseTileModel()` | `"Connected"` / `"Demo mode (no Supabase)"` / `"Connection error"` | Slot built in PR 1; realtime channel status in PR 2 |
| **Integrations: GitHub CI** | `proxyState` | Screen parameter (`'disabled'`) → `githubTileModel()` | `"Connect the local proxy to see CI"` | Slot built in PR 1; workflow run feed in PR 2 |
| **Agents Section** | `task.assigned_agent`, `task.status` | `useTasks()` → `agentsModel()` | `"No active agent tasks"` | PR 1 shows an active task/agent count; fleet cards in PR 3 |
| **Activity Section** | `project_logs`, agent events | Realtime activity feed (PR 4) | `"No activity recorded yet"` | Placeholder empty state in PR 1; log feed not built yet (planned for PR 4) |
