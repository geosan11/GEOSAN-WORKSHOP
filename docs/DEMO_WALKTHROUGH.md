# GEOSAN Workshop — Demo-Mode Walkthrough Guide

This walkthrough guides you through demonstrating the complete **GEOSAN Workshop** command center without requiring a live Supabase instance or active cloud credentials.

---

## 1. Overview of Demo Mode

When `VITE_SUPABASE_URL` is omitted, the application operates 100% locally:
- **Local Persistence**: State and project modifications persist in browser `localStorage`.
- **Instant Reactive Updates**: Real-time events are simulated across tabs via `window.dispatchEvent` and `StorageEvent`.
- **Deterministic Mock Data**: Ready-to-demo execution logs, code diffs, architectural invariants, and agent assignments.
- **Visual Cue**: A quiet non-blocking `Demo Mode` pill in the sidebar header and `Settings`.

---

## 2. Step-by-Step Click Walkthrough

Follow these exact steps during a product demonstration:

### Step 1: Open Projects & Quick Load
1. Launch the app locally:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in your browser.
3. Click **Projects** in the navigation sidebar.
4. If starting fresh, click the **"Load demo scenario"** button in the top action bar (or in Settings).
   * Notice that **TaskPulse (Realtime Issue Tracker)**, **EdgeTelemetry Pipeline**, and **OmniScraper Worker** populate immediately with live progress bars and next steps.

---

### Step 2: Create a New Project with Archetype Defaults
1. Click the **"+ New Project"** primary button.
2. Select the **Full-Stack App** archetype chip.
   * Notice that the defaults pre-populate automatically:
     * **Enabled Providers**: Claude, DeepSeek, GitHub.
     * **Tech Stack**: React, TypeScript, Supabase, PostgreSQL.
     * **Advisor**: `Anthropic · ReviewAgent (Security & Invariants)`.
3. In **Project Name**, enter: `Bilateral Netting Engine`.
4. In **One-Sentence Goal**, enter: `Sub-second multi-currency settlement netting with tenant RLS`.
5. Click **Create Project**.
   * You are immediately navigated to the Project Monitoring view for your new project.

---

### Step 3: Explore Monitoring View, Advisor Card & Monospace Logs
1. On the project monitoring screen, observe:
   * **Project Header**: Status pill (`BUILDING`), Last Commit, and the action bar.
   * **KPI Tiles**: Current Status / Next Step, Active Agents (`Waiting for Supervisor` or assigned agents), Last Update, Month Spend / Cap.
   * **Strategic Advisor Card**:
     * Shows assigned advisor: `ReviewAgent (Anthropic)`.
     * Previews the latest advisor recommendations.
     * Click **"Ask Advisor"** to reveal the focused recommendation panel.
2. Scroll to **Project Activity & Agent Logs**:
   * Inspect the initial project creation audit log.
   * Click **Expand** on any log with a payload (e.g. diffs or plans).
   * Notice the monospace syntax container (diffs highlighted in cyan, JSON in emerald).
   * Click **Copy Output** and observe the green **Copied** confirmation.

---

### Step 4: Pause Agents (Operator Override)
1. In the header action bar, click **"Pause Agents"**.
2. Notice the instant visual feedback:
   * The button transitions to **"Resume"** with an amber outline (`bg-amber-500/20`).
   * The Current Status KPI updates to `PAUSED`.
   * A new log entry (`STATUS_TOGGLE`) is appended to the stream recording the pause action.
3. Click **"Resume"** to return agents to active listening state.

---

### Step 5: Test the Multi-Target Prompt Dock
1. At the bottom of the logs section, locate the prompt dock.
2. Toggle the target pill to **Advisor**.
3. Type: `Audit foreign exchange precision invariants on decimal roundoff`.
4. Click **Consult** (or press Enter).
   * Notice that a new log with `action_type = 'advice'` from `ReviewAgent` appears immediately.
   * The Advisor card preview above refreshes with your latest directive.

---

### Step 6: Attach an Existing Repository with Format Validation
1. Click **Projects** in the sidebar.
2. Click **"+ Attach Existing"**.
3. Choose **GitHub Repository** as the Source Type.
4. Enter an invalid string like `not-a-repo` and click **Verify repo**.
   * Observe the red alert: `Format invalid: Use owner/repo or https://github.com/owner/repo`.
5. Change the input to `geosan11/GEOSAN-WORKSHOP` and click **Verify repo**.
   * Observe the green checkmark: `Format confirmed: geosan11/GEOSAN-WORKSHOP`.
6. Click **Attach Repository**.
7. In the resulting monitoring view header, observe the **"View on GitHub"** button with external link icon.

---

### Step 7: Change Global Interface Scale in Settings
1. Click **Settings** in the sidebar.
2. Under **Interface Scale**, click **Small**.
   * Observe the entire UI scaling down to 87.5% for high-density display.
3. Click **Large**.
   * Observe the entire UI scaling up to 115% for presentations or readability.
4. Return to **Medium** (100% baseline).
5. Refresh the browser to confirm your choice was persisted.

---

## 3. How to Exit Demo Mode (Connecting to Live Supabase)

To connect the application to your live Supabase project:

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
2. Populate your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
3. Run the database migration:
   ```bash
   supabase db push
   # or run supabase/migrations/20261028000000_workshop_aligned.sql in Supabase SQL editor
   ```
4. Restart the development server:
   ```bash
   npm run dev
   ```
   * The sidebar `Demo Mode` pill will disappear and **Settings** will report `Connected`.
