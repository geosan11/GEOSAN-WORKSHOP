# Efecto Design Brief & Architectural Manifesto — AetherOrch (GEOSAN-WORKSHOP)

## 🌌 Executive Summary & Product Mission
**AetherOrch Command Center** is an enterprise-grade multi-agent software orchestration workspace built for engineering leaders, DevOps operators, and AI system architects. It manages the complete software development lifecycle (SDLC) across 4 high-stakes commercial verticals:

1. **EHI Multisystems** — Enterprise core infrastructure, multi-tenant RBAC, and billing gateway.
2. **Iyanuoluwa Vegetable Oil** — Industrial agribusiness logistics, IoT supply chain tracking, and refinery process automation.
3. **Aviation Log Entry** — Flight operations telemetry, captain license verification, and aircraft maintenance compliance.
4. **EdgePoint** — Distributed IoT sensor nodes, edge computing daemons, and low-latency synthetic monitoring.

---

## 🎨 Visual Identity & Brand System (EHI Brand DNA)

### 1. Palette & Surface Architecture
- **Obsidian Dark Mode (`#0D1117`)**: Deep industrial canvas providing contrast for high-density telemetry.
- **Surface Elevation Layer 1 (`#161B22`)**: Glassmorphic container backdrop with subtle 1px border (`rgba(255,255,255,0.08)`).
- **EHI Industrial Gold (`#F0B230` / `#FFBD59`)**: Primary brand accent used for high-priority calls to action, budget highlights, and active telemetry pulses.
- **Emerald Pulse (`#10B981`)**: Real-time nominal health status, passing QA runs, and admitted budget transactions.
- **Cyan Latency (`#06B6D4`)**: Foundation model token telemetry, code snippets, and AST nodes.
- **Crimson Hard-Stop (`#EF4444`)**: Critical vulnerabilities, budget cap breaches, and failed synthetic probes.

### 2. Micro-Interactions & Living Interface Details
- **Ambient Glassmorphism**: `backdrop-filter: blur(12px)` on top navigation, cards, and sliding drawers.
- **Pulsing Status Lights**: `animate-pulse` on active agent executions, connected database endpoints, and real-time SSE streams.
- **Hover Micro-Scale**: Smooth `scale-[1.01]` or `translateY(-1px)` micro-transitions on clickable cards with glowing gold shadows (`glow-amber-hover`).
- **Interactive Tool Explorers & Simulators**: Instant JSON argument payload testing, execution latency counters (in ms), and copyable CLI snippets.

---

## 🧭 Navigation Architecture (10 Integrated Views)

1. **Portfolio (`PORTFOLIO`)**: Multi-tenant registry, health metrics, live activity ticker, monthly spend.
2. **Project Detail (`PROJECT_DETAIL`)**: Deep-dive into EHI, Iyanuoluwa, AeroOps, or EdgePoint with Overview, Tasks, QA, Costs, and Budget tabs.
3. **Agent Console (`AGENT_CONSOLE`)**: Direct prompt dispatch interface to `CoordinatorAgent` with inline plan approval & plan rejection controls.
4. **Cost Center (`COST_CENTER`)**: FinOps analytics dashboard, 30-day spend trend, provider pie chart, feature attribution ledger.
5. **QA Workbench (`QA_RUNS`)**: Autonomous web/mobile/API test results with numbered reproduction steps & screenshot thumbnails.
6. **Settings & Governance (`SETTINGS`)**: Multi-tenant RBAC, budget guardrails, prompt versioning, and **MCP Control Plane**.
7. **Codebase Analyzer (`REPO_ANALYZER`)**: Automated AST code parsing, security scanner, dependency auditor, and visual file graph.
8. **Agent Swarm Workbench (`AGENT_SWARM`)**: Real-time agent sub-task monitor, inter-agent message inspection, token latency breakdown.
9. **Production Monitoring (`PRODUCTION_MONITORING`)**: Edge probe synthetic monitoring engine, endpoint latency tracking, uptime SLA alerts.
10. **Model Router Intelligence (`MODEL_ROUTER`)**: Multi-provider LLM benchmarking (Gemini 3.5, Claude 3.7, DeepSeek R1/V3, Grok 4, OpenAI o3-mini) and fallback rules.

---

## ⚡ Efecto MCP Integration Guidelines
When connecting to **Efecto MCP** (`@efectoapp/mcp`), the platform utilizes the following tools to manipulate state, preview micro-animations, and inspect UI health:
- `inspect_state`: Reads active client state tree & localStorage keys.
- `trigger_effect`: Dispatches UI micro-animations and toast notification sequences.
- `set_theme_mode`: Toggles between **Obsidian Dark Mode** and **Clean Porcelain Light Mode**.
- `audit_design`: Audits visual contrast ratios, typography hierarchy, and padding density against EHI brand rules.
