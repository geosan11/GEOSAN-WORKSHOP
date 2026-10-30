# GEOSAN Workshop — Production Deployment & Environment Guide

This document outlines deployment prerequisites, environment variables, Supabase migrations, build configurations, and post-deployment smoke verification for **GEOSAN Workshop**.

---

## 1. Environment Variables

GEOSAN Workshop operates in two modes:
1. **Live Supabase Mode**: Activated when valid Supabase credentials are provided.
2. **Deterministic Demo Mode**: Seamlessly fallback when `VITE_SUPABASE_URL` is omitted, running in-memory with local state persistence.

### Required Production Environment Variables
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase Project REST & Realtime URL | `https://zxdxsizyvotkcsrtzscw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Client Public API Key | `eyJhbGciOi...` |

### Optional Server Proxy & Model Keys (Server-side Only)
These keys are strictly kept on the server environment / edge secret store and are **never bundled into browser clients**:
| Variable | Description |
| :--- | :--- |
| `ANTHROPIC_API_KEY` | Claude Sonnet / Opus access |
| `DEEPSEEK_API_KEY` | DeepSeek R1 / V3 mathematical reasoning |
| `GOOGLE_AI_KEY` | Gemini 1.5 Pro / Flash access |
| `XAI_API_KEY` | Grok real-time anomaly analysis |
| `GITHUB_TOKEN` | Optional GitHub API rate-limit elevation |

---

## 2. Supabase Database Migration

The workshop schema is consolidated in [`supabase/migrations/20261028000000_workshop_aligned.sql`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/supabase/migrations/20261028000000_workshop_aligned.sql).

### Method A: Via Supabase CLI (Recommended)
```bash
# Link to your remote Supabase project
supabase link --project-ref <your-project-ref>

# Push the migration
supabase db push
```

### Method B: Via Supabase Dashboard (SQL Editor)
1. Open your Supabase Dashboard → **SQL Editor**.
2. Paste the entire contents of [`supabase/migrations/20261028000000_workshop_aligned.sql`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/supabase/migrations/20261028000000_workshop_aligned.sql).
3. Click **Run**.
4. Verify created tables: `projects`, `project_logs`, `agent_assignments`, `provider_configs`, `user_preferences`.

### Realtime Publication Reminder
Ensure that PostgreSQL Realtime publication includes the three core tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_assignments;
```
*(This is already included in the migration file).*

---

## 3. Host Build Settings (Vercel / Cloudflare Pages)

### Vercel Configuration
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: `22.x` or `24.x`

The repository includes a verified [`vercel.json`](file:///home/geosan/Documents/github/GEOSAN-WORKSHOP/vercel.json) providing Single-Page Application (SPA) rewrite rules routing all requests to `/index.html`.

---

## 4. Demo Mode vs. Live Mode Behavior

| Capability | Live Mode (`VITE_SUPABASE_URL` set) | Demo Mode (Missing Env) |
| :--- | :--- | :--- |
| **Data Persistence** | PostgreSQL in Supabase | Browser `localStorage` |
| **Realtime Updates** | WebSocket via Supabase Realtime pub/sub | BroadcastChannel & Storage events |
| **Badge Indicator** | "Connected" pill in Settings | Non-blocking "Demo Mode" pill in Sidebar |
| **Initial Seeding** | Initial migration records | Click "Load demo scenario" to seed `TaskPulse` |

---

## 5. Post-Deployment Smoke Test Checklist

Once deployed to production or staging, verify the following 5 flows:

1. **App Boot & Mode Check**:
   - In Live Mode: Confirm the sidebar shows no connection errors and Settings reports "Connected".
   - In Demo Mode: Confirm the sidebar shows the quiet "Demo Mode" badge.
2. **Project Creation Flow**:
   - Click `+ New Project`.
   - Select archetype `Full-Stack App`, name the project, and submit.
   - Verify immediate navigation to Project Monitoring view with an initial status log.
3. **Repository Attachment**:
   - Click `+ Attach Existing`.
   - Select `GitHub Repository`, enter `geosan11/GEOSAN-WORKSHOP`, and click **Verify repo**.
   - Confirm green format verification badge and submit.
   - Confirm header shows **View on GitHub** external link.
4. **Agent Pause & Log Stream**:
   - Click **Pause Agents** in the header.
   - Confirm button displays **Resume** with amber styling and an audit log is emitted.
   - Type a message in the bottom dock (`Directive` or `Advisor`) and verify it appears immediately in the activity log.
5. **Global Interface Scale**:
   - Navigate to **Settings** → **Interface Scale**.
   - Switch between **Small**, **Medium**, and **Large**.
   - Confirm text, padding, and UI elements scale globally without layout breaks.
