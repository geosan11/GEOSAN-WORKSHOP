# Design System & UI Specifications - GEOSAN-WORKSHOP

## 1. Visual Identity & Design Principles
The visual identity of `GEOSAN-WORKSHOP` reflects industrial reliability, precision telemetry, and high-density operator efficiency. It bridges the **Workshop Control Plane** (internal developer & agent monitoring hub) and the **Product UI System** (standards for generated client applications across tiers).

- **Zero Slop:** No decorative fluff, generic AI gradients, or superfluous container nesting.
- **High-Density Legibility:** Crisp sans-serif paired with dedicated tabular monospace fonts for all numerical data and timestamps.
- **Progressive Depth:** L0 (Ambient 3-second glance) $\to$ L1 (In-situ focus breakdown) $\to$ L2 (Deep pipeline inspector).

---

## 2. The Workshop Control Plane UX (Developer & Monitoring Hub)

Managing multi-tier autonomous projects without a visual control plane forces operators to constantly hunt through raw markdown files in VS Code. The Workshop Control Plane implements a **Three-Pane Split-Workbench layout**:

```text
┌─────────────────┬──────────────────────────────────┬─────────────────┐
│ Project Switcher│ Active Spec & Roadmap            │ Live Inspector  │
│ [Tier Badges]   │ (docs/TASKS.md + CONTRACT.md)    │ (docs/MEMORY.md)│
│                 │                                  │                 │
│ ● EdgePoint     │ Phase 2: Ingestion Pipeline      │ ADR Log:        │
│   (Tier 2: Data)│ ┌──────────────────────────────┐ │ ADR-003: Claude │
│                 │ │ [DONE] Scrape IoT telemetry  │ │ Sonnet critic   │
│ ○ EHI Multi     │ │ [RUNNING] Parse raw payload  │ │                 │
│   (Tier 1: SaaS)│ │ [TODO] Validate Zod schema   │ │ Active Token:   │
│                 │ └──────────────────────────────┘ │ 1,840 / 4,000   │
│ ○ Aviation Log  │                                  │                 │
│   (Tier 3: Util)│ Terminal Stream / Dry-Run Output │ Staged Diffs &  │
│                 │ > schemathesis run openapi.json  │ Git Checkpoints │
└─────────────────┴──────────────────────────────────┴─────────────────┘
```

1. **Left Rail (Project Directory & Tier Filtering):** Groups projects by tier (Full-Stack, Data, Micro-Utility, Ops) with visual health indicators (Healthy, Degraded, Down). Enables instant context switching with a single click.
2. **Center Pane (Spec & Task Orchestrator):** Renders the active project's `TASKS.md` or `SPEC.md` as an interactive checklist. Clicking any task reveals requirements, target files, and plan DAGs.
3. **Right Rail (Persistent Memory & Health HUD):** Displays active environment variable health, uncommitted context notes from `MEMORY.md`, and real-time LLM token attribution.
4. **Global Command Palette (`Cmd+K` / `Ctrl+K`):** Instant keyboard navigation, task dispatching, and density switching.

---

## 3. Product UI System Architecture for Generated Applications

### 3.1 Optimal (Zero Layout Shift & Instant Feedback)
- **Skeleton States Over Spinners:** Replace centered loading spinners with structural skeleton cards that mirror exact layout heights. This eliminates Cumulative Layout Shift (CLS) when data loads asynchronously.
- **Optimistic UI Updates:** Mutation operations (toggling a task, changing a status, saving a record) reflect immediately in the UI before network requests finish, rolling back gracefully with a toast notification only on HTTP failure.
- **High-Density Typography:** Dedicated tabular figures (`tabular-nums`) and monospace typography for all tables, metrics, and numerical data to prevent text shifting during live ticker updates.

### 3.2 Responsive (Breakpoint Degradation Strategy)

| UI Component | Desktop Layout ($\ge$ 1024px) | Mobile Layout ($<$ 768px) | Usability Rationale |
| :--- | :--- | :--- | :--- |
| **Data Tables** | Multi-column grid with inline sorting and batch action bars | Stacked vertical cards showing only primary metric, status, and chevron | Tables on mobile cause horizontal scroll fatigue; cards preserve thumb readability |
| **Navigation** | Persistent sticky top bar with full horizontal tabs (`TopBar.tsx`) | Bottom navigation bar (`MobileNavBar.tsx`) + slide-over drawer | Bottom bar matches thumb zone reachability on mobile devices |
| **Action Triggers** | Inline button rows in headers and table rows | Sticky bottom action bar (`pb-safe`) with high-contrast primary CTA | Keeps primary actions reachable without having to scroll to page tops |
| **Detail Views** | Split-pane slideout or right-hand flyout inspector (`TaskDetailDrawer`) | Full-screen modal or bottom sheet drawer | Maximize vertical screen real estate on compact touch displays |

### 3.3 Comprehensible (Cognitive Load & Information Architecture)
- **The "3-Second Rule" Top Shelf:** The top 25% of any view answers three questions via 3–4 High-Level Metric Cards:
  1. *Is the system healthy?* (Health status indicator + uptime percentage)
  2. *What is current velocity/progress?* (Active tasks count + completion rate)
  3. *What requires immediate action?* (Pending PR approvals + critical QA regressions)
- **Progressive Disclosure (Addendum C):** Hide secondary details, audit logs, and complex filter parameters behind drill-downs, collapsible accordions, or drawer triggers. Do not expose all database columns on initial render.
- **Strict Semantic Color Rules:** Never use color decoratively. Reserve colors purely for state and urgency:
  - **Neutral Slate / Obsidian (`#0d1117`, `#161b22`, `#8b98a8`):** Structural borders, background surfaces, labels.
  - **Emerald (`#10B981`):** Healthy pipelines, completed tasks, positive deltas.
  - **Amber / Gold (`#F0B230`, `#F59E0B`):** Warnings, rate-limit retries, in-progress tasks, approval gates.
  - **Rose / Red (`#EF4444`):** Schema breaks, broken builds, service downtime, critical QA findings.

---

## 4. Color Palette & Design Tokens

```css
:root {
  /* Surface Tokens */
  --bg-app: #0d1117;          /* Obsidian Deep */
  --color-surface-1: #161b22; /* Card Surface */
  --color-surface-2: #1c2333; /* Elevated Surface / Disclosure Detail */
  --color-surface-3: #21262d; /* Hover State */
  
  /* Brand Tokens */
  --color-gold: #F0B230;       /* Geosan Primary Accent */
  --color-gold-hover: #FFBD59; /* Active Hover Accent */
  --color-navy: #084985;       /* Secondary Corporate Navy */
  
  /* Text Tokens */
  --color-text-main: #e6edf3;  /* Primary High-Contrast Text */
  --color-text-sub: #8b98a8;   /* Muted Metadata / Subtext */
  
  /* Borders */
  --color-border-subtle: rgba(255, 255, 255, 0.05);
  --color-border-strong: rgba(255, 255, 255, 0.15);
  
  /* Telemetry Status Colors */
  --color-status-healthy: #10b981; /* Emerald 500 */
  --color-status-warning: #f59e0b; /* Amber 500 */
  --color-status-danger: #ef4444;  /* Red 500 */
  --color-status-info: #06b6d4;    /* Cyan 500 */
}
```

---

## 5. UI Layout Hierarchy & Technical Guidelines

### 5.1 Layout Hierarchy
1. **Metric Shelf:** Grid 4-col (desktop) / 1-col or 2-col (mobile) with stat, delta chip, and label.
2. **Primary Workspace:** 70% data table or interactive canvas, 30% contextual inspector or activity feed.
3. **Persistent Feedback:** Toast notifications in bottom-right corner (`ToastProvider`).

### 5.2 Spacing & Density
- Container Max-Width: `max-w-7xl` centered.
- Standard Padding: `p-4 sm:p-6 lg:p-8`.
- Component Radii: `rounded-xl` for cards, `rounded-lg` for buttons and inputs.
- Touch Targets: Minimum `h-10` (40px) or `h-11` (44px) for all clickable touch surfaces on mobile.

### 5.3 Typography Scale
- **Headings & Display:** Sans-serif Inter with tight tracking (`tracking-tight`).
  - H1: `text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]`
  - H2: `text-xs font-bold uppercase tracking-wider text-[#8b98a8] font-mono`
  - H3: `text-sm md:text-base font-bold text-[#e6edf3]`
- **Data & Telemetry:** Monospace (`font-mono`) with `tabular-nums` for alignment stability.
  - Primary Code: `text-xs font-mono text-[#e6edf3]`
  - Muted Metadata: `text-[10px] md:text-[11px] font-mono text-[#8b98a8]`

---

## 6. UI Component Library Standards

### 6.1 Buttons
- **Primary CTA:** `bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] px-4 py-2 rounded-lg shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#F0B230]`
- **Secondary / Ghost:** `bg-white/5 text-[#8b98a8] hover:text-[#e6edf3] hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 text-xs transition-colors`
- **Destructive:** `bg-red-950/40 text-red-300 hover:bg-red-900 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs transition-colors`

### 6.2 Progressive Disclosure (`Disclosure.tsx`)
- Summary trigger row with right-aligned rotating chevron (`rotate-90 text-[#FFBD59]`).
- Smooth 200ms height transition using CSS Grid:
  ```tsx
  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
    <div className="overflow-hidden">
      <div className="bg-[#1c2333] border-l-2 border-[#F0B230] -mt-[1px] p-3.5 sm:px-4 text-xs text-[#e6edf3]">
        {detail}
      </div>
    </div>
  </div>
  ```
- Persisted under `ehi.disclosure.${persistKey}` in `localStorage`.

---

## 7. Empty, Loading, and Error State UI Patterns
- **Skeleton States:** Structural skeleton cards with pulsing animation (`animate-pulse bg-white/5 rounded-xl`) matching the layout geometry to prevent CLS.
- **Empty State:** Centered container with muted illustration icon, uppercase mono title, and clear primary CTA button (`EmptyState.tsx`).
- **Error State:** Dismissible error banner with retry trigger and toast alerts (`QueryError.tsx`).

---

## 8. Hardware-Accelerated Animation & Swarm Telemetry Standards

Because `GEOSAN-WORKSHOP` runs simultaneously with developer IDEs, local terminal processes, and autonomous agent loops, animation layers must never compete for CPU threads or trigger fan spin-up.

### 8.1 Engine Selection Architecture
- **Compositor-Thread CSS & SVG:** All packet movements, pipeline wires, and agent status transitions strictly manipulate `transform: translate3d(...)`, `scale(...)`, and `opacity`.
- **Zero Canvas / WebGL Overhead:** Modern browsers bypass layout recalculations and repaints, routing coordinates directly to the GPU compositor thread.
- **Microsecond Glitch & Crash States:** Syntax breaks and container crashes toggle a GPU-accelerated `.crashed` keyframe shake rather than re-rendering complex canvas buffers.

### 8.2 Packet Transit & Ingestion
```css
/* GPU-accelerated Packet Transit */
.agent-packet {
  will-change: transform, opacity;
  transform: translate3d(var(--tx, 0), var(--ty, 0), 0);
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out;
}

/* Zero-CPU Crash Shake Keyframes */
@keyframes glitch-shake {
  0% { transform: translate3d(0, 0, 0); }
  25% { transform: translate3d(-3px, 1px, 0); }
  50% { transform: translate3d(2px, -1px, 0); }
  75% { transform: translate3d(-1px, 2px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

.crashed {
  border-color: #ef4444 !important;
  background-color: rgba(69, 10, 10, 0.6) !important;
  animation: glitch-shake 0.15s infinite;
}
```

