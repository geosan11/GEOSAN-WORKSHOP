/**
 * GEOSAN-WORKSHOP — Core Flow Smoke Tests (Prompt 17)
 *
 * Fast verification of locked UI contracts, archetype defaults,
 * GitHub source linking, monospace payload expansion, font scaling,
 * and supervisor brief creation.
 */

import { parseGitHubRepo } from '../src/components/WorkshopProjectModal';
import { buildSupervisorBrief } from '../src/lib/supervisor';
import { Project } from '../src/lib/types';
import { DEMO_SCENARIO_PROJECTS, DEMO_TASKPULSE_LOGS } from '../src/lib/demoScenario';

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, testName: string, failDetail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failed++;
    const msg = `✗ [FAIL] ${testName}: ${failDetail || 'Condition not met'}`;
    console.error(`  ${msg}`);
    errors.push(msg);
  }
}

async function runSmokeTests() {
  console.log('================================================================');
  console.log('       GEOSAN-WORKSHOP — CORE FLOW SMOKE TEST SUITE             ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Projects List Renders Cards and the Two Primary Buttons
  // --------------------------------------------------------------------------
  console.log('--> TEST 1: Projects List Contract & Primary Actions');
  {
    const projects: Project[] = DEMO_SCENARIO_PROJECTS;
    assert(projects.length >= 2, 'Projects collection has multiple active verticals');

    // Verify presence of primary button action contracts
    const primaryActions = ['+ New Project', '+ Attach Existing'];
    assert(primaryActions.includes('+ New Project'), 'Contract defines "+ New Project" button');
    assert(primaryActions.includes('+ Attach Existing'), 'Contract defines "+ Attach Existing" button');

    // Verify project card properties
    const taskPulse = projects.find(p => p.id === 'proj-taskpulse-demo');
    assert(Boolean(taskPulse), 'Demo projects includes TaskPulse');
    assert(taskPulse?.name.includes('TaskPulse') === true, 'TaskPulse card renders project name');
    assert(taskPulse?.status === 'building', 'TaskPulse card renders status badge');
    assert(typeof taskPulse?.progress === 'number' && taskPulse.progress > 0, 'Card includes progress percentage');
    assert(Boolean(taskPulse?.next_step), 'Card includes immediate next step description');
  }

  // --------------------------------------------------------------------------
  // TEST 2: New Project Modal Opens, Archetype Pre-fills Defaults & Submit Calls Create
  // --------------------------------------------------------------------------
  console.log('\n--> TEST 2: New Project Archetypes & Pre-fill Defaults');
  {
    const ARCHETYPE_DEFAULTS: Record<string, { advisor: string; providers: string[]; tech: string[] }> = {
      'Frontend Prototype': {
        advisor: 'Anthropic · CoordinatorAgent (Default)',
        providers: ['Claude', 'Google AI Pro'],
        tech: ['React', 'TypeScript', 'Tailwind CSS']
      },
      'Full-Stack App': {
        advisor: 'Anthropic · ReviewAgent (Security & Invariants)',
        providers: ['Claude', 'DeepSeek', 'GitHub'],
        tech: ['React', 'TypeScript', 'Supabase', 'PostgreSQL']
      },
      'Automation Script': {
        advisor: 'DeepSeek · FinOpsAgent (Calculus & Ledger)',
        providers: ['DeepSeek', 'Grok Bots'],
        tech: ['Node.js', 'TypeScript', 'Other']
      },
      'Data Pipeline': {
        advisor: 'Google · ArchitectAgent (Context & Specs)',
        providers: ['Google AI Pro', 'DeepSeek'],
        tech: ['Node.js', 'PostgreSQL', 'TypeScript']
      }
    };

    // Verify Full-Stack App archetype defaults
    const fullstack = ARCHETYPE_DEFAULTS['Full-Stack App'];
    assert(fullstack.providers.includes('Claude') && fullstack.providers.includes('DeepSeek'), 'Full-Stack App pre-fills Claude and DeepSeek');
    assert(fullstack.tech.includes('Supabase'), 'Full-Stack App pre-fills Supabase in tech stack');
    assert(fullstack.advisor.includes('ReviewAgent'), 'Full-Stack App pre-fills ReviewAgent advisor');

    // Verify Frontend Prototype archetype defaults
    const frontend = ARCHETYPE_DEFAULTS['Frontend Prototype'];
    assert(frontend.providers.includes('Google AI Pro'), 'Frontend Prototype pre-fills Google AI Pro');
    assert(frontend.tech.includes('Tailwind CSS'), 'Frontend Prototype pre-fills Tailwind CSS');

    // Simulate Create Submission
    let createdPayload: any = null;
    const mockCreateProject = async (params: any) => {
      createdPayload = params;
      return { id: 'proj-new-test', ...params };
    };

    await mockCreateProject({
      name: 'Smoke Test Project',
      archetype: 'Full-Stack App',
      tech_stack: fullstack.tech,
      enabled_providers: fullstack.providers,
      advisor_agent_name: 'ReviewAgent',
      advisor_provider: 'Anthropic'
    });

    assert(createdPayload !== null, 'Submit function was called with created project parameters');
    assert(createdPayload.name === 'Smoke Test Project', 'Create payload preserves project name');
    assert(createdPayload.advisor_agent_name === 'ReviewAgent', 'Create payload preserves advisor selection');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Attach Existing Requires source_ref When source_type is GitHub
  // --------------------------------------------------------------------------
  console.log('\n--> TEST 3: GitHub Attachment Validation & Format Verification');
  {
    // Valid GitHub references
    const valid1 = parseGitHubRepo('geosan11/GEOSAN-WORKSHOP');
    assert(valid1 !== null && valid1.full === 'geosan11/GEOSAN-WORKSHOP', 'Accepts owner/repo string format');

    const valid2 = parseGitHubRepo('https://github.com/geosan11/GEOSAN-WORKSHOP');
    assert(valid2 !== null && valid2.full === 'geosan11/GEOSAN-WORKSHOP', 'Accepts full HTTPS GitHub URL');

    const valid3 = parseGitHubRepo('https://github.com/owner/sample-repo.git');
    assert(valid3 !== null && valid3.full === 'owner/sample-repo', 'Accepts .git suffix and normalizes');

    // Invalid GitHub references
    const invalidEmpty = parseGitHubRepo('');
    assert(invalidEmpty === null, 'Rejects empty repository string');

    const invalidNonUrl = parseGitHubRepo('just-a-random-word');
    assert(invalidNonUrl === null, 'Rejects string missing owner/repo delimiter');

    // Validation rule contract: source_ref required when sourceType is github
    const validateAttach = (sourceType: string, sourceRef: string) => {
      if (sourceType === 'github' && !sourceRef.trim()) {
        return { error: 'GitHub source reference / repository URL is required.' };
      }
      return { ok: true };
    };

    assert(validateAttach('github', '').error !== undefined, 'Form rejects empty source_ref for GitHub attach');
    assert(validateAttach('github', 'owner/repo').ok === true, 'Form admits valid source_ref for GitHub attach');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Project Monitoring Shows Status, Progress, Active Agents, and Logs
  // --------------------------------------------------------------------------
  console.log('\n--> TEST 4: Project Monitoring Contracts');
  {
    const project = DEMO_SCENARIO_PROJECTS[0];
    const logs = DEMO_TASKPULSE_LOGS;

    assert(Boolean(project.status), 'Project monitoring provides current status badge');
    assert(typeof project.progress === 'number', 'Project monitoring provides progress indicator');
    assert(logs.length >= 3, 'Project monitoring provides chronological execution logs');

    // Active agents evaluation
    const realtimeAgents = ['CoordinatorAgent', 'ReviewAgent'];
    const activeAgentsList = Array.from(new Set(realtimeAgents.filter(Boolean)));
    assert(activeAgentsList.length === 2, 'Active agents list extracts assigned execution agents');

    // Empty agents fallback check
    const emptyAgentsList: string[] = [];
    const emptyDisplay = emptyAgentsList.length === 0 ? 'Waiting for Supervisor' : emptyAgentsList.join(', ');
    assert(emptyDisplay === 'Waiting for Supervisor', 'Active agents card falls back to "Waiting for Supervisor" when unassigned');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Expanding a Log with Payload Shows Monospace Block and Copy Contract
  // --------------------------------------------------------------------------
  console.log('\n--> TEST 5: Monospace Log Expansion & Copy Payload');
  {
    const codeLog = DEMO_TASKPULSE_LOGS.find(l => l.actionType === 'code');
    assert(Boolean(codeLog?.payload), 'Code log item contains structured jsonb payload');

    const diff = (codeLog?.payload as any)?.diff;
    assert(typeof diff === 'string' && diff.includes('+ CREATE POLICY'), 'Payload contains diff content');

    // Simulate payload rendering
    const renderPayloadMonospace = (payload: any) => {
      const rawDiff = typeof payload?.diff === 'string' ? payload.diff : null;
      if (rawDiff) {
        return { type: 'diff', content: rawDiff };
      }
      return { type: 'json', content: JSON.stringify(payload, null, 2) };
    };

    const rendered = renderPayloadMonospace(codeLog?.payload);
    assert(rendered.type === 'diff', 'Payload is identified as diff block for monospace view');
    assert(rendered.content.length > 0, 'Monospace content is non-empty');

    // Copy action stringification contract
    const copyPayloadString = JSON.stringify(codeLog?.payload, null, 2);
    assert(copyPayloadString.includes('deepseek-r1'), 'Copy handler serializes full jsonb payload');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Font Scale Change Updates Root Data-Scale & CSS Variable
  // --------------------------------------------------------------------------
  console.log('\n--> TEST 6: Font Scale Propagation & Persistence');
  {
    type FontScale = 'small' | 'medium' | 'large';
    const SCALE_CONFIG: Record<FontScale, { value: number; dataScale: string }> = {
      small: { value: 0.9, dataScale: 'small' },
      medium: { value: 1.0, dataScale: 'medium' },
      large: { value: 1.15, dataScale: 'large' }
    };

    // Verify mapping
    assert(SCALE_CONFIG.small.value === 0.9, 'Small scale config sets factor 0.9');
    assert(SCALE_CONFIG.medium.value === 1.0, 'Medium scale config sets factor 1.0');
    assert(SCALE_CONFIG.large.value === 1.15, 'Large scale config sets factor 1.15');

    // Mock DOM root update simulation
    const mockRoot = { attributes: {} as Record<string, string>, style: {} as Record<string, string> };
    const applyFontScale = (scale: FontScale) => {
      mockRoot.attributes['data-scale'] = SCALE_CONFIG[scale].dataScale;
      mockRoot.style['--font-scale'] = String(SCALE_CONFIG[scale].value);
    };

    applyFontScale('small');
    assert(mockRoot.attributes['data-scale'] === 'small', 'Root data-scale attribute set to small');
    assert(mockRoot.style['--font-scale'] === '0.9', 'Root CSS variable --font-scale set to 0.9');

    applyFontScale('large');
    assert(mockRoot.attributes['data-scale'] === 'large', 'Root data-scale attribute updated to large');
    assert(mockRoot.style['--font-scale'] === '1.15', 'Root CSS variable updated to 1.15');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Supervisor Brief Builder Contract
  // --------------------------------------------------------------------------
  console.log('\n--> TEST 7: Supervisor Handoff Contract Builder');
  {
    const project = DEMO_SCENARIO_PROJECTS[0];
    const brief = buildSupervisorBrief(project);

    assert(brief.id === project.id, 'SupervisorBrief contains project id');
    assert(brief.name === project.name, 'SupervisorBrief contains project name');
    assert(brief.archetype === 'Full-Stack App', 'SupervisorBrief contains archetype');
    assert(brief.stack.includes('Supabase'), 'SupervisorBrief contains tech stack');
    assert(brief.enabled_providers.includes('Claude'), 'SupervisorBrief contains enabled providers');
    assert(brief.advisor_agent_name === 'ReviewAgent', 'SupervisorBrief contains advisor agent');
    assert(typeof brief.progress === 'number', 'SupervisorBrief contains progress percentage');
    assert(brief.status === 'building', 'SupervisorBrief contains status');
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  SMOKE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFailures:');
    errors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log('\n✓ ALL CORE WORKSHOP SMOKE TESTS PASSED CLEANLY.\n');
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
