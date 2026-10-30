/**
 * SDLC Discovery Engine & Pre-Build Architecture Scoping
 *
 * Provides a structured 6-phase software development lifecycle questionnaire
 * designed to eliminate ambiguity, define invariants, and reduce development
 * time by >50% before any agent or engineer writes code.
 */


export interface SDLCQuestion {
  id: string;
  phaseId: string;
  category: string;
  title: string;
  question: string;
  whyItMatters: string;
  hint: string;
  criticality: 'blocker' | 'high' | 'recommended';
}

export interface SDLCPhase {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  timeSavingsBenefit: string;
  iconName: 'Compass' | 'Database' | 'Shield' | 'WifiOff' | 'Gauge' | 'CheckCircle';
  questions: SDLCQuestion[];
}

export interface ProjectDiscoveryState {
  projectId: string;
  answers: Record<string, string>; // questionId -> answer text
  lastUpdated: string;
  readinessScore: number; // 0 to 100
  notes?: string;
}

export const SDLC_PHASES: SDLCPhase[] = [
  {
    id: 'phase-1-problem-scope',
    number: 1,
    title: 'Phase 1: Problem Definition & Scope Invariants',
    shortTitle: '1. Problem & Scope',
    tagline: 'Define core job-to-be-done and strictly enforce what is OUT of scope',
    description:
      'Eliminates feature creep, prevents building the wrong abstractions, and establishes unambiguous acceptance criteria.',
    timeSavingsBenefit: 'Cuts scope creep and requirement churn by ~45%',
    iconName: 'Compass',
    questions: [
      {
        id: 'q1-1-persona-outcome',
        phaseId: 'phase-1-problem-scope',
        category: 'Scope & Personas',
        title: 'Primary User Persona & Single Success Metric',
        question: 'Who is the exact primary user, and what single quantitative metric defines MVP success?',
        whyItMatters:
          'Teams waste weeks building secondary features when the primary workflow lacks measurable validation.',
        hint: 'e.g., Station weighbridge clerks: ticket issuance under 12 seconds with zero ledger discrepancy.',
        criticality: 'blocker'
      },
      {
        id: 'q1-2-out-of-scope',
        phaseId: 'phase-1-problem-scope',
        category: 'Scope Boundary',
        title: 'Explicit Non-Goals (What is strictly OUT of scope for v1?)',
        question: 'What features, integrations, or platforms are explicitly forbidden for initial release?',
        whyItMatters:
          'Clearly drawn non-goals stop subagent reasoning drift and prevent developers from building prematurely complex abstractions.',
        hint: 'e.g., No multi-currency crypto settlement in v1; strictly fiat Naira (NGN) bank transfers and direct cash receipts.',
        criticality: 'blocker'
      },
      {
        id: 'q1-3-critical-journey',
        phaseId: 'phase-1-problem-scope',
        category: 'User Journey',
        title: 'The Golden Path Transaction Lifecycle',
        question: 'What are the exact sequential steps of the primary transaction from inception to immutable close?',
        whyItMatters:
          'Pinpoints the critical state machine transitions before database tables and UI screens are implemented.',
        hint: 'e.g., Truck arrival -> weigh-in capture -> quality lab assay -> waybill approval -> settlement issuance.',
        criticality: 'high'
      }
    ]
  },
  {
    id: 'phase-2-data-architecture',
    number: 2,
    title: 'Phase 2: Data Modeling, Schemas & Ledger Invariants',
    shortTitle: '2. Data Architecture',
    tagline: 'Define core relational entities, ledger immutability, and state machine',
    description:
      'Prevents costly relational database refactoring, orphaned records, and floating-point financial bugs.',
    timeSavingsBenefit: 'Eliminates ~60% of database schema migration headaches',
    iconName: 'Database',
    questions: [
      {
        id: 'q2-1-core-entities',
        phaseId: 'phase-2-data-architecture',
        category: 'Schema Design',
        title: 'Core Relational Entities & Relationship Graph',
        question: 'What are the primary relational tables, their unique composite keys, and cascade deletion rules?',
        whyItMatters:
          'Changing foreign keys and primary table structures midway through development invalidates code across all layers.',
        hint: 'e.g., projects, agent_tasks, cost_events, qa_runs with org_id multi-tenant composite indexes.',
        criticality: 'blocker'
      },
      {
        id: 'q2-2-ledger-invariants',
        phaseId: 'phase-2-data-architecture',
        category: 'Invariants & Precision',
        title: 'Financial & Audit Ledger Immutability Rules',
        question: 'What tables are append-only audit ledgers, and how are calculations kept mathematically deterministic?',
        whyItMatters:
          'Retrofitting immutable audit logs or fixing floating-point rounding errors after production launch is high risk.',
        hint: 'e.g., Never use IEEE 754 floats for currency; store integer cents or micro-units with BigInt. Transactions table is insert-only.',
        criticality: 'blocker'
      },
      {
        id: 'q2-3-state-machine',
        phaseId: 'phase-2-data-architecture',
        category: 'State Machine',
        title: 'Explicit Entity Status Transitions',
        question: 'What are the permissible status transitions for primary business records, and who can trigger them?',
        whyItMatters:
          'Prevents illegal states (e.g., an invoice transitioning from "cancelled" to "paid" without supervisor override).',
        hint: 'e.g., proposed -> queued -> running -> awaiting_approval -> done | failed | cancelled.',
        criticality: 'high'
      }
    ]
  },
  {
    id: 'phase-3-security-auth',
    number: 3,
    title: 'Phase 3: Security Boundaries, RBAC & Multi-Tenant Isolation',
    shortTitle: '3. Security & RBAC',
    tagline: 'Lock down Row Level Security (RLS), tenant isolation, and cryptographic proofs',
    description:
      'Ensures multi-tenant boundaries are proven at the database engine level, preventing cross-customer data leaks.',
    timeSavingsBenefit: 'Prevents total architectural rewrites due to security audits',
    iconName: 'Shield',
    questions: [
      {
        id: 'q3-1-tenant-isolation',
        phaseId: 'phase-3-security-auth',
        category: 'Multi-Tenancy',
        title: 'Tenant Boundary Enforcement (PostgreSQL RLS)',
        question: 'How is tenant isolation enforced at the database layer to guarantee zero cross-tenant leakage?',
        whyItMatters:
          'Relying solely on frontend or API application filters inevitably leads to authorization bypasses.',
        hint: 'e.g., Enforce Supabase PostgreSQL RLS: USING (org_id = auth.jwt() ->> "org_id") with BYPASSRLS restricted to super_admin.',
        criticality: 'blocker'
      },
      {
        id: 'q3-2-rbac-matrix',
        phaseId: 'phase-3-security-auth',
        category: 'Authorization',
        title: 'Role-Based Access Control (RBAC) Hierarchy',
        question: 'What exact roles exist in the system, and what actions are strictly restricted to elevated tiers?',
        whyItMatters:
          'Ambiguous permission hierarchies lead to messy if/else role checks scattered across UI code.',
        hint: 'e.g., super_admin (budget override, signoff), engineer (task dispatch, QA crawl), viewer (read-only audit).',
        criticality: 'high'
      },
      {
        id: 'q3-3-secrets-pii',
        phaseId: 'phase-3-security-auth',
        category: 'Credentials & PII',
        title: 'Secrets Management & Token Redaction Strategy',
        question: 'How are third-party API tokens, OAuth refresh secrets, and customer PII scrubbed from logs and error traces?',
        whyItMatters:
          'Accidental exposure of tokens in browser error monitors or agent logs breaches security standards.',
        hint: 'e.g., In-memory sanitizeToken regex redacting ghp_*, Bearer *, and credit card numbers before telemetry persistence.',
        criticality: 'blocker'
      }
    ]
  },
  {
    id: 'phase-4-integrations-offline',
    number: 4,
    title: 'Phase 4: Integrations, Offline Resilience & Edge Sync',
    shortTitle: '4. Integrations & Offline',
    tagline: 'Plan upstream failure modes, retry backoffs, and intermittent connectivity',
    description:
      'Guarantees your application handles offline tablets, flaky mobile towers, and upstream API downtime without crashing.',
    timeSavingsBenefit: 'Eliminates 70% of network-related production bugs',
    iconName: 'WifiOff',
    questions: [
      {
        id: 'q4-1-offline-sync',
        phaseId: 'phase-4-integrations-offline',
        category: 'Offline Resilience',
        title: 'Offline-First Queue & Local Storage Policy',
        question: 'What is the exact offline behavior when a user operates in low-connectivity or airplane mode?',
        whyItMatters:
          'Retrofitting local caching and queue replay after building an online-only app requires rewriting the data layer.',
        hint: 'e.g., SQLite / IndexedDB local mutation queue with optimistic UI state and idempotency UUID keys.',
        criticality: 'blocker'
      },
      {
        id: 'q4-2-conflict-resolution',
        phaseId: 'phase-4-integrations-offline',
        category: 'Replication',
        title: 'Reconnection Conflict Resolution Rules',
        question: 'When offline devices reconnect and sync concurrent edits, what rule resolves conflicting writes?',
        whyItMatters:
          'Unspecified conflict policies result in silent data overwrites and customer transaction discrepancies.',
        hint: 'e.g., Last-write-wins by high-resolution server timestamp, or CRDT operational transforms for collaborative entries.',
        criticality: 'high'
      },
      {
        id: 'q4-3-third-party-fallback',
        phaseId: 'phase-4-integrations-offline',
        category: 'API Resilience',
        title: 'Upstream Degradation & Circuit Breaking',
        question: 'What happens when upstream providers (GitHub, Supabase, LLM Gateway) return HTTP 429 or 503?',
        whyItMatters:
          'Prevents cascading server crashes and continuous client retry storms.',
        hint: 'e.g., Exponential backoff with jitter (1s, 2s, 4s, 8s max), in-memory cached fallback, graceful UI degraded badge.',
        criticality: 'high'
      }
    ]
  },
  {
    id: 'phase-5-performance-sla',
    number: 5,
    title: 'Phase 5: Performance, Latency SLAs & Budget Caps',
    shortTitle: '5. SLAs & Budget Caps',
    tagline: 'Set p95 latency boundaries, throughput limits, and hard-stop financial guards',
    description:
      'Avoids runaway cloud spend, serverless cold-start lags, and subagent infinite API call loops.',
    timeSavingsBenefit: 'Saves thousands in unexpected cloud & inference bills',
    iconName: 'Gauge',
    questions: [
      {
        id: 'q5-1-latency-targets',
        phaseId: 'phase-5-performance-sla',
        category: 'Performance SLAs',
        title: 'p95 Latency & Virtualization Targets',
        question: 'What are the required response times for primary queries, and what virtualization threshold is needed?',
        whyItMatters:
          'Rendering thousands of unvirtualized DOM elements causes browser freezing and poor mobile battery life.',
        hint: 'e.g., API response < 120ms p95; use @tanstack/react-virtual on any list exceeding 50 entries (transactions, audit rows).',
        criticality: 'high'
      },
      {
        id: 'q5-2-budget-caps',
        phaseId: 'phase-5-performance-sla',
        category: 'Cost Governance',
        title: 'Monthly Spend Limits & Hard-Stop Admission Rules',
        question: 'What is the strict monthly budget cap per project, and what happens when 80% and 100% are reached?',
        whyItMatters:
          'Autonomous subagents without budget hard stops can consume thousands of dollars in hours during recursion loops.',
        hint: 'e.g., Soft alert at 80% monthly spend; hard stop at 100% where gateway refuses non-essential inference calls.',
        criticality: 'blocker'
      },
      {
        id: 'q5-3-caching-ttl',
        phaseId: 'phase-5-performance-sla',
        category: 'Caching Strategy',
        title: 'Caching Strategy & Upstream Request Deduplication',
        question: 'What data is cached, what is the TTL, and how is redundant upstream polling prevented?',
        whyItMatters:
          'Deduplicating upstream requests protects rate-limits and cuts platform overhead.',
        hint: 'e.g., Shared 1-hour in-memory TTL on external status checks; refresh queries within window return cached state.',
        criticality: 'high'
      }
    ]
  },
  {
    id: 'phase-6-verification-deploy',
    number: 6,
    title: 'Phase 6: Quality Gates, Automated MCP Tests & Deployment',
    shortTitle: '6. Verification & Deploy',
    tagline: 'Define autonomous test criteria, security gates, and rollback policies',
    description:
      'Transforms QA from an afterthought into automated invariant checks that gate every PR and deploy.',
    timeSavingsBenefit: 'Eliminates 90% of manual pre-release regression testing',
    iconName: 'CheckCircle',
    questions: [
      {
        id: 'q6-1-pr-quality-gates',
        phaseId: 'phase-6-verification-deploy',
        category: 'Quality Gates',
        title: 'Autonomous PR Approval & Invariant Signoff Criteria',
        question: 'What automated test suites and agent signoffs are mandatory before a pull request can merge?',
        whyItMatters:
          'Human code review is inconsistent without deterministic CI assertions.',
        hint: 'e.g., 100% strict TypeScript pass (tsc --noEmit), deterministic budget replay check, ReviewAgent security signoff.',
        criticality: 'blocker'
      },
      {
        id: 'q6-2-qa-crawls',
        phaseId: 'phase-6-verification-deploy',
        category: 'Autonomous QA',
        title: 'Targeted & Exploratory QA Test Coverage',
        question: 'What autonomous QA test engines are run against previews before production deployment?',
        whyItMatters:
          'Catches visual regressions, broken forms, and mobile viewport clipping before customers experience them.',
        hint: 'e.g., OWASP security penetration crawl + agent-qa exploratory mobile crawl + Schemathesis contract suite.',
        criticality: 'high'
      },
      {
        id: 'q6-3-canary-rollback',
        phaseId: 'phase-6-verification-deploy',
        category: 'Release Governance',
        title: 'Production Canary Promotion & Instant Rollback Trigger',
        question: 'What monitoring metrics trigger an automatic rollback to the previous healthy deployment?',
        whyItMatters:
          'Instant automated rollbacks prevent bad builds from impacting production customers for more than seconds.',
        hint: 'e.g., Automatic Vercel/Cloud Run instant rollback if 5xx error rate > 0.5% or health check pings fail 3 times consecutively.',
        criticality: 'blocker'
      }
    ]
  }
];

export const DESIGN_CONTRACT_PHASE: SDLCPhase = {
  id: 'phase-1b-design-contract',
  number: 1.5,
  title: 'Phase 1b: Design Contract & Signature Object',
  shortTitle: '1b. Design Contract',
  tagline: 'Bind physical signature object, 3 pinned references, and zero-slop grammar',
  description:
    'Prevents generic SaaS card grids. Requires signature object, physical setting, 3 references, and forbidden anti-patterns.',
  timeSavingsBenefit: 'Eliminates 100% of generic dashboard churn before code generation',
  iconName: 'Compass',
  questions: [
    {
      id: 'q1b-1-signature-object',
      phaseId: 'phase-1b-design-contract',
      category: 'Signature Object',
      title: 'Signature Object (The Thing Operator Holds)',
      question: 'What is the signature physical or logical object the operator interacts with (Ticket, debt line, log entry, sensor node — never "dashboard")?',
      whyItMatters: 'Prevents building a generic card-grid SaaS layout that confuses operational workers.',
      hint: 'e.g., Weighbridge ticket tape WB-YYYY-XXXXX, payor debt line with audit stamp, flight logbook leg.',
      criticality: 'blocker'
    },
    {
      id: 'q1b-2-setting-context',
      phaseId: 'phase-1b-design-contract',
      category: 'Operational Setting',
      title: 'Physical Setting & Operating Context',
      question: 'What is the operational environment (yard, ward, cockpit, tower), lighting, distance from screen, gloves, or one-handed use?',
      whyItMatters: 'Determines touch target size, contrast ratios, and density delta.',
      hint: 'e.g., Weighbridge scale shack, direct sunlight, diesel dust, single-hand touch.',
      criticality: 'blocker'
    },
    {
      id: 'q1b-3-three-references',
      phaseId: 'phase-1b-design-contract',
      category: 'Design References',
      title: 'Three Pinned Domain References (Steal & Leave)',
      question: 'What are the exactly three physical or terminal references, with explicit "what to steal" and "what to leave"?',
      whyItMatters: 'Forces grounded structural grammar from real industrial artifacts instead of dribbble slop.',
      hint: 'e.g., Siemens SCADA terminal: steal high-contrast status beacons, leave gamified progress bars.',
      criticality: 'blocker'
    },
    {
      id: 'q1b-4-forbidden-list',
      phaseId: 'phase-1b-design-contract',
      category: 'Forbidden Anti-Patterns',
      title: 'Forbidden Anti-Patterns (Minimum 5)',
      question: 'What are the forbidden anti-patterns (e.g. 3 stat cards, gradients, buzzwords, generic sidebar)?',
      whyItMatters: 'Formally gates ReviewAgent from accepting generic templates.',
      hint: 'e.g., Hero banner, pastel gradient, "Welcome back", 3 stat cards in a row.',
      criticality: 'blocker'
    },
    {
      id: 'q1b-5-sample-copy-voice',
      phaseId: 'phase-1b-design-contract',
      category: 'Domain Copy Deck',
      title: 'Ten Contract Nouns & Voice Strings',
      question: 'What are the ten contract nouns and sample copy strings that chat and plan prompts must strictly use?',
      whyItMatters: 'Prevents prompts saying "user" and "item" instead of truck_plate and product_code.',
      hint: 'e.g., truck_plate, gross_weight_kg, tare_weight_kg, product_code, ticket_number.',
      criticality: 'high'
    }
  ]
};

export const UI_SDLC_PHASES: SDLCPhase[] = [
  SDLC_PHASES[0],
  DESIGN_CONTRACT_PHASE,
  ...SDLC_PHASES.slice(1)
];

/**
 * Discovery answers already captured for existing client projects, keyed by
 * canonical project id. Any other project starts with empty answers.
 */
/** Empty: the pre-filled answers belonged to the removed placeholder projects. */
export const PREPOPULATED_PROJECT_DISCOVERY: Record<string, Record<string, string>> = {};

const inMemoryDiscovery: Record<string, ProjectDiscoveryState> = {};

/**
 * Storage helpers for project discovery answers
 */
export function loadProjectDiscovery(projectId: string): ProjectDiscoveryState {
  const defaultAnswers = PREPOPULATED_PROJECT_DISCOVERY[projectId] || {};

  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(`aetherorch_discovery_${projectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const state: ProjectDiscoveryState = {
          projectId,
          answers: { ...defaultAnswers, ...(parsed.answers || {}) },
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          readinessScore: calculateReadinessScore({ ...defaultAnswers, ...(parsed.answers || {}) }),
          notes: parsed.notes || ''
        };
        inMemoryDiscovery[projectId] = state;
        return state;
      }
    } catch {}
  }

  if (inMemoryDiscovery[projectId]) {
    return inMemoryDiscovery[projectId];
  }

  const initial: ProjectDiscoveryState = {
    projectId,
    answers: defaultAnswers,
    lastUpdated: new Date().toISOString(),
    readinessScore: calculateReadinessScore(defaultAnswers),
    notes: ''
  };
  inMemoryDiscovery[projectId] = initial;
  return initial;
}

export function saveProjectDiscovery(state: ProjectDiscoveryState): void {
  state.readinessScore = calculateReadinessScore(state.answers);
  state.lastUpdated = new Date().toISOString();
  inMemoryDiscovery[state.projectId] = { ...state, answers: { ...state.answers } };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`aetherorch_discovery_${state.projectId}`, JSON.stringify(state));
    } catch {}
  }
}

export function calculateReadinessScore(answers: Record<string, string>): number {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const phase of SDLC_PHASES) {
    for (const q of phase.questions) {
      const weight = q.criticality === 'blocker' ? 3 : q.criticality === 'high' ? 2 : 1;
      totalWeight += weight;
      const ans = answers[q.id];
      if (ans && ans.trim().length > 15) {
        earnedWeight += weight;
      }
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((earnedWeight / totalWeight) * 100);
}

/**
 * Compiles the answered SDLC questions into a production-grade Architecture Blueprint
 * and multi-agent system specification.
 */
export function generateArchitectureBlueprint(
  projectName: string,
  vertical: string,
  state: ProjectDiscoveryState
): string {
  const score = calculateReadinessScore(state.answers);
  const now = new Date().toISOString();

  let doc = `# SYSTEM ARCHITECTURE SPECIFICATION & AGENT BLUEPRINT
**Project:** ${projectName} (${vertical})
**Readiness Score:** ${score}% Ready for Autonomous Implementation
**Generated At:** ${now}
**Governing Harness:** AetherOrch Multi-Agent Orchestrator

---

## 1. Executive Summary & Core Boundaries
${state.answers['q1-1-persona-outcome'] || 'Not specified'}

### Explicit Non-Goals (Out of Scope for v1):
${state.answers['q1-2-out-of-scope'] || 'Not specified'}

### Primary Transaction Lifecycle:
${state.answers['q1-3-critical-journey'] || 'Not specified'}

---

## 2. Relational Schema & Ledger Invariants
### Entities & Cascade Rules:
${state.answers['q2-1-core-entities'] || 'Not specified'}

### Mathematical & Ledger Invariants:
${state.answers['q2-2-ledger-invariants'] || 'Not specified'}

### Permissible State Machine Transitions:
${state.answers['q2-3-state-machine'] || 'Not specified'}

---

## 3. Security, Multi-Tenant Isolation & RBAC
### Row Level Security (RLS) Policy:
${state.answers['q3-1-tenant-isolation'] || 'Not specified'}

### Role-Based Access Control (RBAC):
${state.answers['q3-2-rbac-matrix'] || 'Not specified'}

### Secrets Redaction & PII Protection:
${state.answers['q3-3-secrets-pii'] || 'Not specified'}

---

## 4. Upstream Resilience, Offline Sync & Edge Fault Tolerance
### Offline Storage & Sync Queue:
${state.answers['q4-1-offline-sync'] || 'Not specified'}

### Conflict Resolution Strategy:
${state.answers['q4-2-conflict-resolution'] || 'Not specified'}

### Third-Party Degradation & Circuit Breaking:
${state.answers['q4-3-third-party-fallback'] || 'Not specified'}

---

## 5. Performance SLAs & Budget Governance
### Latency SLA & Virtualization:
${state.answers['q5-1-latency-targets'] || 'Not specified'}

### Monthly Budget Cap & Hard Stop:
${state.answers['q5-2-budget-caps'] || 'Not specified'}

### Caching TTL & Upstream Deduplication:
${state.answers['q5-3-caching-ttl'] || 'Not specified'}

---

## 6. Autonomous Verification Gates & Rollout Policy
### Pull Request Approval Gates:
${state.answers['q6-1-pr-quality-gates'] || 'Not specified'}

### Autonomous QA Crawls & Security Pen-Tests:
${state.answers['q6-2-qa-crawls'] || 'Not specified'}

### Canary Promotion & Automatic Rollback Trigger:
${state.answers['q6-3-canary-rollback'] || 'Not specified'}

---
*Generated by AetherOrch SDLC Discovery Engine. Formally gates all subagent code synthesis.*
`;

  return doc;
}
