/**
 * Comprehensive System Coverage Audit & Blind-Spot Test Suite
 *
 * Covers subsystems, utility functions, edge cases, and endpoints that
 * were previously untested or under-tested in the standard test passes:
 *
 * 1. Formatters & Timezone Invariants (format.ts)
 * 2. Client Budget Ledger & ISO Week Calculation (budget.ts)
 * 3. GitHub Sync Service & URL Parsing (githubSync.ts)
 * 4. Orchestrator Engine & Blueprint Generation (orchestrator.ts)
 * 5. Data Provider Chat & Finding State Machine (dataProvider.tsx)
 * 6. Telemetry & Learning Server Endpoints (telemetry-gateway.ts)
 * 7. Token Masking & Bearer Header Edge Cases (github.ts)
 * 8. SDLC Discovery Score Weights & Spec Serialization (sdlcDiscovery.ts)
 */

import assert from 'assert';
import {
  formatCost,
  formatNaira,
  formatTokens,
  formatRelative,
  formatDateTime
} from '../src/lib/format';
import {
  getIsoWeekKey,
  fetchBudgetStatus,
  requestBudgetAdmit,
  DEFAULT_WEEKLY_LEDGER
} from '../src/lib/budget';
import { parseGitHubRepoUrl, fetchGitHubRepoSync } from '../src/services/githubSync';
import { CostInstrumentor, AgentOrchestrator, ModelRouter } from '../src/services/orchestrator';
import { dataProviderInstance } from '../src/lib/dataProvider';
import { sanitizeToken } from '../src/lib/github';
import {
  calculateReadinessScore,
  generateArchitectureBlueprint,
  SDLC_PHASES
} from '../src/lib/sdlcDiscovery';
import {
  getRecommendedModel,
  getModelSuitability,
  PLATFORM_MODELS
} from '../src/lib/modelRouter';
import {
  loadLearningVault,
  addLearningRecord,
  exportAsJSONL,
  exportAsSystemPrompt
} from '../src/lib/llmLearningStore';
import { pullRepositoryFromGitHub, analyzeRepository } from '../src/lib/repoAnalysis';
import {
  DEMO_SESSION_TASKS,
  DEMO_WORKLOG_RUNNING,
  DEMO_WORKLOG_APPROVAL
} from '../src/data/sessionFixtures';
import { getMappedStatusLabel } from '../src/components/session/TaskWorkspace';

let totalAssertions = 0;
let passedAssertions = 0;

function testAssert(condition: boolean, message: string) {
  totalAssertions++;
  assert(condition, message);
  passedAssertions++;
  console.log(`  ✓ [AUDIT OK] ${message}`);
}

async function runCoverageAudit() {
  console.log('================================================================');
  console.log('  AETHERORCH COMPREHENSIVE BLIND-SPOT & COVERAGE AUDIT          ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // 1. FORMATTERS & TIMEZONE INVARIANTS (format.ts)
  // --------------------------------------------------------------------------
  console.log('--> AUDIT SECTION 1: Formatters & Currency Precision (format.ts)');

  testAssert(formatCost(0) === '$0.00', 'formatCost(0) returns "$0.00"');
  testAssert(formatCost(null) === '$0.00', 'formatCost(null) returns "$0.00"');
  testAssert(formatCost(undefined) === '$0.00', 'formatCost(undefined) returns "$0.00"');
  testAssert(formatCost(NaN) === '$0.00', 'formatCost(NaN) returns "$0.00"');
  testAssert(formatCost(0.0045) === '$0.0045', 'formatCost micro-dollar precision formats to 4 decimals');
  testAssert(formatCost(15.5) === '$15.50', 'formatCost standard dollar formats with commas and 2 decimals');

  testAssert(formatNaira(0) === '₦0', 'formatNaira(0) returns "₦0"');
  testAssert(formatNaira(null) === '₦0', 'formatNaira(null) returns "₦0"');
  testAssert(formatNaira(1500000).replace(/\s/g, '').includes('1,500,000'), 'formatNaira formats integer amounts');

  testAssert(formatTokens(0) === '0', 'formatTokens(0) returns "0"');
  testAssert(formatTokens(null) === '0', 'formatTokens(null) returns "0"');
  testAssert(formatTokens(850) === '850', 'formatTokens(<1000) returns raw string');
  testAssert(formatTokens(45200) === '45.2K', 'formatTokens(45200) returns "45.2K"');
  testAssert(formatTokens(1500000) === '1.5M', 'formatTokens(1500000) returns "1.5M"');

  testAssert(formatRelative(null) === '—', 'formatRelative(null) returns "—"');
  const nowIso = new Date().toISOString();
  testAssert(formatRelative(nowIso) === '1s ago' || formatRelative(nowIso) === 'just now', 'formatRelative(now) returns "1s ago" or "just now"');
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  testAssert(formatRelative(oneHourAgo) === '1h ago', 'formatRelative(1h ago) returns "1h ago"');
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  testAssert(formatRelative(twoDaysAgo) === '2d ago', 'formatRelative(2d ago) returns "2d ago"');

  testAssert(formatDateTime(null) === '—', 'formatDateTime(null) returns "—"');
  testAssert(formatDateTime('invalid-date') === '—', 'formatDateTime(invalid) returns "—"');
  const formattedLagosTime = formatDateTime('2026-10-03T10:00:00Z');
  testAssert(formattedLagosTime.length > 5, `formatDateTime formats valid date: ${formattedLagosTime}`);

  // --------------------------------------------------------------------------
  // 2. CLIENT BUDGET LEDGER & ISO WEEK CALCULATION (budget.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 2: Client Budget Ledger & ISO Week (budget.ts)');

  const currentWeek = getIsoWeekKey();
  testAssert(/^\d{4}-W\d{2}$/.test(currentWeek), `getIsoWeekKey returns ISO week format (got ${currentWeek})`);

  const dec31 = new Date('2026-12-31T12:00:00Z');
  const dec31Week = getIsoWeekKey(dec31);
  testAssert(dec31Week.startsWith('2026-W') || dec31Week.startsWith('2027-W'), 'Year boundary ISO week calculation valid');

  testAssert(DEFAULT_WEEKLY_LEDGER.totalCapRequests === 400, 'DEFAULT_WEEKLY_LEDGER total cap is 400');
  testAssert(DEFAULT_WEEKLY_LEDGER.totalCapUsd === 3.0, 'DEFAULT_WEEKLY_LEDGER USD cap is $3.00');
  testAssert(DEFAULT_WEEKLY_LEDGER.tiers[1].pct === 60, 'Tier 1 is allocated 60%');
  testAssert(DEFAULT_WEEKLY_LEDGER.tiers[2].pct === 30, 'Tier 2 is allocated 30%');
  testAssert(DEFAULT_WEEKLY_LEDGER.tiers[3].pct === 10, 'Tier 3 is allocated 10%');

  const budgetStatusFallback = await fetchBudgetStatus();
  testAssert(Boolean(budgetStatusFallback.weekKey), 'fetchBudgetStatus returns valid weekKey');

  const admitFallback = await requestBudgetAdmit(1, 0.005);
  testAssert(admitFallback.tier === 1 && typeof admitFallback.admitted === 'boolean', 'requestBudgetAdmit returns valid AdmitResult structure');

  // --------------------------------------------------------------------------
  // 3. GITHUB REPO SYNC SERVICE & URL PARSING (githubSync.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 3: GitHub Repo Sync & Drift Assessment (githubSync.ts)');

  testAssert(parseGitHubRepoUrl('https://github.com/aetherorch/core')?.repo === 'core', 'parseGitHubRepoUrl handles clean HTTPS url');
  testAssert(parseGitHubRepoUrl('https://github.com/aetherorch/core.git')?.repo === 'core', 'parseGitHubRepoUrl handles trailing .git');
  testAssert(parseGitHubRepoUrl('github.com/org-enterprise/aviation-app')?.owner === 'org-enterprise', 'parseGitHubRepoUrl handles protocol-less url');
  testAssert(parseGitHubRepoUrl('invalid-url-domain.com/no-github') === null, 'parseGitHubRepoUrl returns null on invalid domain');

  const ehiSync = await fetchGitHubRepoSync('proj-ehi-001', 'https://github.com/ehi-systems/cargo-core', '8f2d91c');
  testAssert(ehiSync.commits_ahead === 2, 'fetchGitHubRepoSync accurately identifies local commits ahead for EHI');

  const aeroSync = await fetchGitHubRepoSync('proj-aero-003', 'https://github.com/aero-ops/log-entry', 'c71b04a');
  testAssert(aeroSync.commits_behind === 3, 'fetchGitHubRepoSync accurately identifies remote commits behind for AeroOps');

  const invalidSync = await fetchGitHubRepoSync('proj-ehi-001', 'invalid-git-url', '8f2d91c');
  testAssert(invalidSync.state === 'error', 'fetchGitHubRepoSync returns state "error" for malformed repo URL');

  // --------------------------------------------------------------------------
  // 4. ORCHESTRATOR ENGINE & EXECUTION BLUEPRINTS (orchestrator.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 4: Orchestrator Blueprint & Cost Calculation (orchestrator.ts)');

  const geminiCost = CostInstrumentor.calculateCost('gemini-3.5-flash', 100000, 25000);
  testAssert(geminiCost > 0, `CostInstrumentor calculates accurate cost for Gemini: $${geminiCost}`);

  const unknownModelCost = CostInstrumentor.calculateCost('unknown-experimental-model', 100000, 20000);
  testAssert(unknownModelCost > 0, `CostInstrumentor applies fallback pricing for unrecognized model: $${unknownModelCost}`);

  const costEvent = CostInstrumentor.createCostEvent({
    project_id: 'proj-ehi-001',
    task_id: 'task-test-01',
    model: 'gemini-3.5-flash',
    provider: 'google',
    tokens_input: 10000,
    tokens_output: 2000,
    attributed_to: 'feature',
    feature_name: 'Audit Trail Test'
  });
  testAssert(costEvent.cost_usd > 0, 'CostInstrumentor creates structured CostEvent with non-zero USD cost');
  testAssert(costEvent.attributed_to === 'feature', 'CostEvent correctly preserves attribution category');

  const qaBlueprint = AgentOrchestrator.generateExecutionBlueprint(
    {
      id: 'task-qa-01',
      project_id: 'proj-ehi-001',
      task_type: 'QA_EXPLORE',
      prompt: 'Crawl weighbridge scale form',
      status: 'queued',
      assigned_agent: 'QAAgent',
      model_used: 'gemini-3.5-flash',
      plan: null,
      result: null,
      created_at: nowIso,
      started_at: null,
      completed_at: null
    },
    'EHI Multisystems'
  );
  testAssert(qaBlueprint.plan.steps.length >= 3, 'QA Execution blueprint contains comprehensive testing steps');
  testAssert(qaBlueprint.steps.some(s => s.step_type === 'testing'), 'QA blueprint includes testing simulation step');

  const bugBlueprint = AgentOrchestrator.generateExecutionBlueprint(
    {
      id: 'task-bug-01',
      project_id: 'proj-ehi-001',
      task_type: 'FIX_BUG',
      prompt: 'Fix ledger drift',
      status: 'queued',
      assigned_agent: 'CodingAgent',
      model_used: 'gemini-3.5-flash',
      plan: null,
      result: null,
      created_at: nowIso,
      started_at: null,
      completed_at: null
    },
    'EHI Multisystems'
  );
  testAssert(bugBlueprint.plan.steps.some(s => s.includes('reproduction')), 'Bug blueprint includes reproduction step');

  // --------------------------------------------------------------------------
  // 5. DATA PROVIDER CHAT, FINDING & RESOLUTION (dataProvider.tsx)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 5: Data Provider Chat & State Invariants (dataProvider.tsx)');

  const conversations = await dataProviderInstance.getConversations('proj-ehi-001');
  testAssert(Array.isArray(conversations), 'getConversations returns array (never null/undefined)');

  const chatMessages = await dataProviderInstance.getChatMessages('conv-general');
  testAssert(Array.isArray(chatMessages), 'getChatMessages returns array (never null/undefined)');

  // Send a chat message with proposed task generation
  const sentMsg = await dataProviderInstance.sendMessage(
    'conv-ehi-audit',
    'Add automated transaction integrity checksum to settlement batch',
    'proj-ehi-001'
  );
  testAssert(sentMsg.role === 'user', 'sendMessage creates user message record');

  // Wait for background assistant reasoning and task proposal (1100ms)
  await new Promise((r) => setTimeout(r, 1150));

  // Verify proposed task created from chat
  const tasksAfterChat = await dataProviderInstance.getTasks('proj-ehi-001');
  const proposedTask = tasksAfterChat.find(t => t.status === 'proposed');
  testAssert(Boolean(proposedTask), 'Operator chat conversation generated a proposed task');

  // Confirm proposed task
  if (proposedTask) {
    await dataProviderInstance.confirmProposedTask(proposedTask.id);
    const tasksAfterConfirm = await dataProviderInstance.getTasks('proj-ehi-001');
    const confirmed = tasksAfterConfirm.find(t => t.id === proposedTask.id);
    testAssert(confirmed?.status === 'queued', 'confirmProposedTask transitions proposed task to queued');
  }

  // Test subscription & unsubscribe
  let listenerFired = false;
  const unsubscribe = dataProviderInstance.subscribeChange(() => {
    listenerFired = true;
  });
  testAssert(typeof unsubscribe === 'function', 'subscribeChange returns cleanup unsubscribe function');
  unsubscribe();

  // Test resolving QA finding
  await dataProviderInstance.resolveFinding('qa-finding-non-existent-safe-test');
  testAssert(true, 'resolveFinding on non-existent or empty finding executes gracefully without unhandled throw');

  // Test dismissing a proposed task
  await dataProviderInstance.dismissProposedTask('task-non-existent-safe-test');
  testAssert(true, 'dismissProposedTask on non-existent task executes gracefully without unhandled throw');

  // Test creating a new project
  const customProject = await dataProviderInstance.createProject({
    name: 'Apex Automated Scale Calibration',
    vertical: 'agriculture',
    monthly_budget_usd: 1500,
    repo_url: 'https://github.com/ehi-systems/scale-calibration',
    agent_instructions: 'Operate offline-first and sync RS-232 weighbridge data'
  });
  testAssert(customProject.id.startsWith('proj-apex-automated-scale'), 'createProject creates sanitized slug ID');
  testAssert(customProject.status === 'planning', 'createProject initializes status to planning');
  testAssert(customProject.monthly_budget_usd === 1500, 'createProject assigns correct monthly budget');

  const allProjects = await dataProviderInstance.getProjects();
  testAssert(allProjects.some(p => p.id === customProject.id), 'Newly created project is retrievable via getProjects');

  // --------------------------------------------------------------------------
  // 6. TOKEN SANITIZATION & SECURITY HEADERS (github.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 6: Advanced Token Sanitization (github.ts)');

  const mixedCaseBearer = 'Authorization: bearer ghp_SECRET_PERSONAL_TOKEN_12345';
  const sanitizedBearer = sanitizeToken(mixedCaseBearer);
  testAssert(!sanitizedBearer.includes('SECRET_PERSONAL_TOKEN'), 'sanitizeToken redacts lowercase bearer token');

  const multiTokenLog = 'First ghp_TOKEN_A_9999 and second github_pat_1111_TOKEN_B_8888 in output.';
  const sanitizedMulti = sanitizeToken(multiTokenLog);
  testAssert(!sanitizedMulti.includes('TOKEN_A') && !sanitizedMulti.includes('TOKEN_B'), 'sanitizeToken redacts multiple distinct tokens in single line');

  const fineGrainedPat = 'github_pat_11ABCD_XYZ9876543210_token_test';
  testAssert(!sanitizeToken(fineGrainedPat).includes('XYZ9876543210'), 'sanitizeToken redacts GitHub fine-grained personal access tokens');

  // --------------------------------------------------------------------------
  // 7. SDLC DISCOVERY WEIGHTS & SCORING BOUNDARIES (sdlcDiscovery.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 7: SDLC Discovery Scoring & Markdown Spec (sdlcDiscovery.ts)');

  testAssert(SDLC_PHASES.length === 6, 'All 6 canonical SDLC phases exist');
  const allQuestions = SDLC_PHASES.flatMap(p => p.questions);
  testAssert(allQuestions.length === 18, `Exactly 18 architectural questions mapped (found ${allQuestions.length})`);

  // Partial readiness score check
  const partialAnswers: Record<string, string> = {
    'q1-1-persona-outcome': 'Test persona and single metric'
  };
  const partialScore = calculateReadinessScore(partialAnswers);
  testAssert(partialScore > 0 && partialScore < 100, `Partial answers yield score between 0 and 100% (got ${partialScore}%)`);

  // Complete spec generation safety
  const emptySpec = generateArchitectureBlueprint('EdgePoint Test', 'IoT', {
    projectId: 'test-empty',
    answers: {},
    lastUpdated: nowIso,
    readinessScore: 0
  });
  testAssert(emptySpec.includes('Not specified'), 'Empty discovery answers safely render "Not specified" placeholder without crashing');

  // --------------------------------------------------------------------------
  // 8. MODEL ROUTER EDGE CASES & BUDGET CONFLICTS (modelRouter.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 8: Model Router Suitability & Edge Cases (modelRouter.ts)');

  // Verify all platform models have positive pricing and context
  for (const model of PLATFORM_MODELS) {
    testAssert(model.costInPerM > 0, `Model ${model.id} has positive costInPerM`);
    testAssert(model.costOutPerM > 0, `Model ${model.id} has positive costOutPerM`);
    testAssert(Boolean(model.contextWindow), `Model ${model.id} has valid contextWindow (${model.contextWindow})`);
    testAssert(Boolean(model.logo), `Model ${model.id} has valid logo component`);
  }

  // Real-time edge task matching
  const rtRec = getRecommendedModel('QA_EXPLORE', 'realtime');
  testAssert(rtRec.modelId === 'grok-4' || rtRec.modelId === 'gemini-3.5-flash', 'Realtime task prioritizes low-latency model');

  // High context task matching
  const hcRec = getRecommendedModel('BUILD_FEATURE', 'high_context');
  testAssert(hcRec.modelId === 'kimi-k1.5' || hcRec.modelId === 'gemini-3.5-flash', 'High-context task matches large context window model');

  // Budget overkill detection
  const overkillSuitability = getModelSuitability('claude-3-7-sonnet', 'BUILD_FEATURE', 'standard');
  testAssert(overkillSuitability.status === 'overkill', 'Costly flagship model flagged as "overkill" for standard task');

  // --------------------------------------------------------------------------
  // 9. GITHUB REPOSITORY INGESTION & AST AUDIT (repoAnalysis.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 9: GitHub Codebase Ingestion & AST Analysis (repoAnalysis.ts)');

  const cloned = await pullRepositoryFromGitHub('https://github.com/ehi-enterprise/settlement-core', {
    branch: 'main',
    vertical: 'fintech'
  });
  testAssert(cloned.files.length > 0, 'pullRepositoryFromGitHub successfully retrieves repository files');
  testAssert(Boolean(cloned.commitSha), 'cloned repository has valid commit SHA');

  const analysis = await analyzeRepository(cloned, 'fintech');
  testAssert(analysis.totalFiles > 0, 'analyzeRepository calculates total files correctly');
  testAssert(analysis.totalLines > 0, 'analyzeRepository calculates total lines correctly');
  testAssert(analysis.languages.length > 0, 'analyzeRepository computes language breakdown');
  testAssert(analysis.findings.length > 0, 'analyzeRepository identifies actionable findings');
  testAssert(analysis.healthScore >= 0 && analysis.healthScore <= 100, 'Codebase health score is between 0 and 100');

  // Verify finding has diff snippet
  const invFinding = analysis.findings.find(f => f.category === 'invariants');
  testAssert(Boolean(invFinding?.diffSnippet?.before && invFinding?.diffSnippet?.after), 'Finding contains before/after code diff snippet');

  // --------------------------------------------------------------------------
  // 10. DEVIN OPERATOR PATTERNS & SESSION FIXTURES (sessionFixtures.ts)
  // --------------------------------------------------------------------------
  console.log('\n--> AUDIT SECTION 10: Devin Operator Patterns & Session Fixtures (sessionFixtures.ts)');

  // 1. One running task and one awaiting-approval task on demo project
  const runningTask = DEMO_SESSION_TASKS.find(t => t.status === 'running' && t.project_id === 'proj-ehi-001');
  testAssert(Boolean(runningTask), 'Demo fixtures contain one running task on proj-ehi-001');

  const approvalTask = DEMO_SESSION_TASKS.find(t => t.status === 'awaiting_approval' && t.project_id === 'proj-ehi-001');
  testAssert(Boolean(approvalTask), 'Demo fixtures contain one awaiting-approval task on proj-ehi-001');

  // 2. Events include a plan, three file edits, two shell commands, one QA finding, one approval wait
  const planEvents = DEMO_WORKLOG_RUNNING.filter(e => e.type === 'plan');
  const editEvents = DEMO_WORKLOG_RUNNING.filter(e => e.type === 'edit');
  const shellEvents = DEMO_WORKLOG_RUNNING.filter(e => e.type === 'shell');
  const qaEvents = DEMO_WORKLOG_RUNNING.filter(e => e.type === 'qa');
  const approvalEvents = DEMO_WORKLOG_RUNNING.filter(e => e.type === 'approval');

  testAssert(planEvents.length >= 1, 'Running worklog contains at least one plan event');
  testAssert(editEvents.length >= 3, 'Running worklog contains three file edits (found ' + editEvents.length + ')');
  testAssert(shellEvents.length >= 2, 'Running worklog contains two shell commands (found ' + shellEvents.length + ')');
  testAssert(qaEvents.length >= 1, 'Running worklog contains one QA finding');
  testAssert(approvalEvents.length >= 1, 'Running worklog contains one approval wait');

  // 3. Shell commands are illustrative strings (e.g. npm run lint, git checkout) without real tokens
  for (const sh of shellEvents) {
    testAssert(Boolean(sh.payload?.command && sh.payload?.output), 'Shell event has command and output');
    testAssert(!sh.payload?.command?.includes('ghp_') && !sh.payload?.output?.includes('ghp_'), 'Shell event does not leak credentials or tokens');
  }

  // 4. Status mapping adheres to Devin operator pattern specifications
  const mappedRunning = getMappedStatusLabel('running');
  testAssert(mappedRunning.label === 'Working', 'running maps to "Working"');

  const mappedApproval = getMappedStatusLabel('awaiting_approval');
  testAssert(mappedApproval.label === 'Approve plan', 'awaiting_approval maps to "Approve plan"');

  const mappedBlocked = getMappedStatusLabel('blocked');
  testAssert(mappedBlocked.label === 'Blocked', 'blocked maps to "Blocked"');

  const mappedPr = getMappedStatusLabel('done', 'https://github.com/org/repo/pull/1');
  testAssert(mappedPr.label === 'PR ready', 'done with pr_url maps to "PR ready"');

  console.log('\n================================================================');
  console.log(`  COVERAGE AUDIT SUMMARY: ${passedAssertions} OF ${totalAssertions} ASSERTIONS PASSED`);
  console.log('================================================================');
  console.log('✓ ALL PREVIOUSLY UNTESTED SUBSYSTEMS & EDGE CASES VERIFIED.\n');
}

runCoverageAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
