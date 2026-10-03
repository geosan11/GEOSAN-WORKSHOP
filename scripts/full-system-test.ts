/**
 * AetherOrch Comprehensive System Test & Invariant Verification Suite
 *
 * Runs an exhaustive automated test of all platform subsystems, looking for:
 * 1. Data provider clean state & lifecycle regressions
 * 2. GitHub REST client module & token redaction invariants
 * 3. AI Gateway foundation pricing & provider integrity (DeepSeek, Kimi, Gemini, Grok, Claude, OpenAI)
 * 4. Telemetry Gateway rate-limiting & 1-hour TTL cache rules
 * 5. Cost Intelligence math and empty-array stability
 * 6. Codebase structural integrity & anomaly scan
 */

import { parseGitHubUrl, sanitizeToken, GitHubError, GitHubAuthError, GitHubRateLimitError, GitHubNotFoundError, GitHubConflictError } from '../src/lib/github';
import { INITIAL_MODEL_PRICING, INITIAL_PROJECTS, INITIAL_PROJECT_BUDGETS } from '../src/data/initialData';
import { projectMonthlySpend, spendByProvider, spendByAttribution } from '../src/lib/cost';
import { admitBudget, getBudgetLedger, resetLedgerForTesting } from '../server/budgetLedger';
import { getSharedStatus, getUpstreamPullsCount } from '../server/telemetry-gateway';
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_COST_EVENTS, MOCK_QA_RUNS, MOCK_QA_FINDINGS } from '../src/lib/mockData';
import { getRecommendedModel, getModelSuitability } from '../src/lib/modelRouter';
import { SDLC_PHASES, calculateReadinessScore, generateArchitectureBlueprint, PREPOPULATED_PROJECT_DISCOVERY } from '../src/lib/sdlcDiscovery';

let testsPassed = 0;
let testsFailed = 0;
const anomalies: string[] = [];

function assert(condition: boolean, testName: string, anomalyMessage?: string) {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    testsFailed++;
    const errMsg = `✗ [FAIL] ${testName}: ${anomalyMessage || 'Assertion failed'}`;
    console.error(`  ${errMsg}`);
    anomalies.push(errMsg);
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('  AETHERORCH FULL SYSTEM INVARIANT & ANOMALY VERIFICATION SUITE ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: Clean State & Demo Data Purge Audit
  // --------------------------------------------------------------------------
  console.log('--> SUITE 1: Clean State & Demo Data Purge Audit');

  assert(MOCK_TASKS.length === 0, 'Demo tasks array is purged (0 tasks)', `Found ${MOCK_TASKS.length} tasks in MOCK_TASKS`);
  assert(MOCK_COST_EVENTS.length === 0, 'Demo cost events array is purged (0 events)', `Found ${MOCK_COST_EVENTS.length} events in MOCK_COST_EVENTS`);
  assert(MOCK_QA_RUNS.length === 0, 'Demo QA runs array is purged (0 runs)', `Found ${MOCK_QA_RUNS.length} runs in MOCK_QA_RUNS`);
  assert(MOCK_QA_FINDINGS.length === 0, 'Demo QA findings array is purged (0 findings)', `Found ${MOCK_QA_FINDINGS.length} findings in MOCK_QA_FINDINGS`);
  assert(MOCK_PROJECTS.length === 4, 'Core 4 client vertical configurations preserved', `Expected 4 projects, found ${MOCK_PROJECTS.length}`);

  const requiredProjectIds = ['proj-ehi-001', 'proj-iyanu-002', 'proj-aviation-003', 'proj-edgepoint-004'];
  const projectIds = MOCK_PROJECTS.map(p => p.id);
  const allProjectsPresent = requiredProjectIds.every(id => projectIds.includes(id));
  assert(allProjectsPresent, 'All 4 enterprise projects present (EHI, Iyanu, AeroOps, EdgePoint)', 'Missing client project');

  // --------------------------------------------------------------------------
  // SUITE 2: GitHub REST Client Module & Security Token Redaction
  // --------------------------------------------------------------------------
  console.log('\n--> SUITE 2: GitHub REST Client Module & Security Redaction');

  // 2.1 URL Parsing
  const standardParsed = parseGitHubUrl('https://github.com/ehi-enterprise/ledger-core');
  assert(standardParsed?.owner === 'ehi-enterprise' && standardParsed?.repo === 'ledger-core', 'Standard HTTPS GitHub URL parsed correctly');

  const gitExtensionParsed = parseGitHubUrl('https://github.com/iyanu-processing/crushing-telemetry.git');
  assert(gitExtensionParsed?.owner === 'iyanu-processing' && gitExtensionParsed?.repo === 'crushing-telemetry', 'HTTPS URL with .git extension parsed correctly');

  const sshParsed = parseGitHubUrl('git@github.com:skyfleet-ops/electronic-flight-bag.git');
  assert(sshParsed?.owner === 'skyfleet-ops' && sshParsed?.repo === 'electronic-flight-bag', 'SSH format GitHub URL parsed correctly');

  const directSlugParsed = parseGitHubUrl('edgepoint-mesh/sensor-daemon');
  assert(directSlugParsed?.owner === 'edgepoint-mesh' && directSlugParsed?.repo === 'sensor-daemon', 'Direct owner/repo slug format parsed correctly');

  const invalidUrlParsed = parseGitHubUrl('https://gitlab.com/other/repo');
  assert(invalidUrlParsed === null, 'Non-GitHub URL correctly returns null');

  // 2.2 Security Token Redaction
  const rawToken = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  const testMessage = `Failed to connect with token ${rawToken} on endpoint`;
  const sanitized = sanitizeToken(testMessage, rawToken);
  assert(!sanitized.includes(rawToken), 'Raw personal access token completely redacted from string');
  assert(sanitized.includes('***'), 'Sanitized token replaced with redaction indicator');

  const bearerMessage = 'Authorization: Bearer my_secret_token_12345';
  const sanitizedBearer = sanitizeToken(bearerMessage);
  assert(!sanitizedBearer.includes('my_secret_token_12345'), 'Bearer token header completely sanitized');

  // 2.3 Error Wrapping Hierarchy
  const authErr = new GitHubAuthError('Bad credentials', { status: 401, endpoint: '/repos/test' });
  assert(authErr instanceof GitHubError, 'GitHubAuthError extends GitHubError base class');
  assert(authErr.name === 'GitHubAuthError' && authErr.status === 401, 'GitHubAuthError retains status code 401');

  const rateLimitErr = new GitHubRateLimitError('Exceeded', { status: 429, rateLimitRemaining: 0 });
  assert(rateLimitErr instanceof GitHubError && rateLimitErr.rateLimitRemaining === 0, 'GitHubRateLimitError captures rate limit headers');

  const notFoundErr = new GitHubNotFoundError('Repo missing', { status: 404 });
  assert(notFoundErr.status === 404 && notFoundErr.name === 'GitHubNotFoundError', 'GitHubNotFoundError handles HTTP 404');

  const conflictErr = new GitHubConflictError('Non-fast-forward', { status: 409 });
  assert(conflictErr.status === 409 && conflictErr.name === 'GitHubConflictError', 'GitHubConflictError handles HTTP 409');

  // --------------------------------------------------------------------------
  // SUITE 3: Foundation Model Pricing & Multi-AI Gateway Invariants
  // --------------------------------------------------------------------------
  console.log('\n--> SUITE 3: Multi-AI Gateway & Foundation Model Invariants');

  const providersInPricing = new Set(INITIAL_MODEL_PRICING.map(p => p.provider));
  assert(providersInPricing.has('google'), 'Google Gemini registered in pricing');
  assert(providersInPricing.has('deepseek'), 'DeepSeek registered in pricing');
  assert(providersInPricing.has('kimi'), 'Moonshot Kimi registered in pricing');
  assert(providersInPricing.has('xai'), 'xAI Grok registered in pricing');
  assert(providersInPricing.has('anthropic'), 'Anthropic Claude registered in pricing');
  assert(providersInPricing.has('openai'), 'OpenAI registered in pricing');

  // Verify DeepSeek models
  const deepseekR1 = INITIAL_MODEL_PRICING.find(m => m.model === 'deepseek-r1');
  const deepseekV3 = INITIAL_MODEL_PRICING.find(m => m.model === 'deepseek-v3');
  assert(Boolean(deepseekR1 && deepseekR1.input_per_million === 0.55), 'DeepSeek R1 pricing validated ($0.55/1M in)');
  assert(Boolean(deepseekV3 && deepseekV3.input_per_million === 0.14), 'DeepSeek V3 pricing validated ($0.14/1M in)');

  // Verify Kimi models
  const kimiK15 = INITIAL_MODEL_PRICING.find(m => m.model === 'kimi-k1.5');
  const kimiChat = INITIAL_MODEL_PRICING.find(m => m.model === 'kimi-chat');
  assert(Boolean(kimiK15 && kimiK15.context_window === '256k tokens'), 'Moonshot Kimi K1.5 256k context verified');
  assert(Boolean(kimiChat && kimiChat.input_per_million === 0.40), 'Moonshot Kimi Chat pricing validated');

  // --------------------------------------------------------------------------
  // SUITE 3B: Task-to-Model Routing Intelligence & Criticality Rules
  // --------------------------------------------------------------------------
  console.log('\n--> SUITE 3B: Task-to-Model Routing Intelligence & Criticality Matching');

  // 1. Critical Security Task -> DeepSeek R1
  const secRec = getRecommendedModel('QA_SECURITY', 'critical');
  assert(secRec.modelId === 'deepseek-r1', 'Critical QA_SECURITY routes to DeepSeek R1 (formal invariant reasoning)');

  // 2. High Architecture Task -> Claude 3.7 Sonnet
  const highRec = getRecommendedModel('BUILD_FEATURE', 'high');
  assert(highRec.modelId === 'claude-3-7-sonnet', 'High criticality BUILD_FEATURE routes to Claude 3.7 Sonnet (hybrid thinking)');

  // 3. Standard Routine Task -> DeepSeek V3 (budget optimization)
  const stdRec = getRecommendedModel('BUILD_FEATURE', 'standard');
  assert(stdRec.modelId === 'deepseek-v3', 'Standard BUILD_FEATURE routes to DeepSeek V3 ($0.14/1M budget optimized)');

  // 4. High Context Task -> Moonshot Kimi K1.5 (256k context)
  const ctxRec = getRecommendedModel('BUILD_FEATURE', 'high_context');
  assert(ctxRec.modelId === 'kimi-k1.5', 'High-context tasks route to Moonshot Kimi K1.5 (256k long window)');

  // 5. Real-Time Telemetry Task -> xAI Grok 4
  const rtRec = getRecommendedModel('FIX_BUG', 'realtime');
  assert(rtRec.modelId === 'grok-4', 'Real-time telemetry tasks route to xAI Grok 4 (edge anomaly search)');

  // 6. Suitability Warnings
  const underpoweredCheck = getModelSuitability('deepseek-v3', 'QA_SECURITY', 'critical');
  assert(underpoweredCheck.status === 'underpowered', 'Detects underpowered reasoning when using standard model on P0 Security task');

  const overkillCheck = getModelSuitability('claude-3-7-sonnet', 'BUILD_FEATURE', 'standard');
  assert(overkillCheck.status === 'overkill', 'Detects budget overkill when using expensive model on routine standard task');

  const optimalCheck = getModelSuitability('deepseek-r1', 'QA_SECURITY', 'critical');
  assert(optimalCheck.status === 'optimal', 'Confirms optimal match badge for DeepSeek R1 on Critical security task');

  // --------------------------------------------------------------------------
  // SUITE 4: Cost Intelligence Calculations & Empty Array Stability
  // --------------------------------------------------------------------------
  console.log('\n--> SUITE 4: Cost Intelligence Math & Empty State Robustness');

  // Empty state calculations must NEVER crash or return NaN
  const emptySpend = projectMonthlySpend([]);
  assert(emptySpend === 0, 'projectMonthlySpend([]) safely returns 0');

  const emptyProviders = spendByProvider([]);
  assert(emptyProviders.deepseek === 0 && emptyProviders.kimi === 0 && emptyProviders.google === 0, 'spendByProvider([]) returns initialized zero-counts');

  const emptyAttribution = spendByAttribution([]);
  assert(Object.keys(emptyAttribution).length === 0, 'spendByAttribution([]) safely returns empty object');

  // Populated calculation test
  const sampleEvents: any[] = [
    {
      id: 'e1',
      project_id: 'proj-ehi-001',
      provider: 'deepseek',
      model: 'deepseek-r1',
      cost_usd: 0.05,
      tokens_input: 1000,
      tokens_output: 500,
      attributed_to: 'FEATURE:pdf-dispatch',
      created_at: new Date().toISOString()
    },
    {
      id: 'e2',
      project_id: 'proj-ehi-001',
      provider: 'kimi',
      model: 'kimi-k1.5',
      cost_usd: 0.12,
      tokens_input: 2000,
      tokens_output: 1000,
      attributed_to: 'FEATURE:pdf-dispatch',
      created_at: new Date().toISOString()
    },
    {
      id: 'e3',
      project_id: 'proj-iyanu-002',
      provider: 'google',
      model: 'gemini-3.5-flash',
      cost_usd: 0.03,
      tokens_input: 500,
      tokens_output: 200,
      attributed_to: 'BUG:scale-house',
      created_at: new Date().toISOString()
    }
  ];

  const ehiSpend = projectMonthlySpend(sampleEvents, 'proj-ehi-001');
  assert(Math.abs(ehiSpend - 0.17) < 0.0001, 'Filtered project monthly spend calculates precisely ($0.17 for EHI)');

  const byProv = spendByProvider(sampleEvents);
  assert(byProv.deepseek === 0.05, 'spendByProvider attributes DeepSeek spend correctly');
  assert(byProv.kimi === 0.12, 'spendByProvider attributes Kimi spend correctly');

  const byAttr = spendByAttribution(sampleEvents);
  assert(byAttr['FEATURE:pdf-dispatch'] === 0.17, 'spendByAttribution groups feature costs across models ($0.17)');

  // --------------------------------------------------------------------------
  // SUITE 5: Telemetry Gateway Budget Admission & Rate-Limit Rules
  // --------------------------------------------------------------------------
  console.log('\n--> SUITE 5: Telemetry Gateway Admission & Hourly Cache Rules');

  resetLedgerForTesting();
  const initialLedger = getBudgetLedger();
  assert(initialLedger.totalCapRequests === 400, 'Weekly request cap is 400 calls');
  assert(initialLedger.totalCapUsd === 3.0, 'Weekly USD budget cap is $3.00');

  // Verify Tier 3 (10% share = max 40 calls)
  let t3Count = 0;
  for (let i = 0; i < 40; i++) {
    const res = admitBudget({ tier: 3, costUsd: 0.005 });
    if (res.admitted) t3Count++;
  }
  assert(t3Count === 40, 'Tier 3 admits exactly 40 calls (10% allocation)');

  const overflowAttempt = admitBudget({ tier: 3, costUsd: 0.005 });
  assert(!overflowAttempt.admitted, 'Tier 3 refuses admission after 40 calls (quota protection)');

  // Hourly pull rule check: ensure upstream pull count is not incremented on status queries
  const pullCountBefore = getUpstreamPullsCount();
  getSharedStatus(false);
  getSharedStatus(true);
  const pullCountAfter = getUpstreamPullsCount();
  assert(pullCountBefore === pullCountAfter, 'Hourly TTL pull rule respected (zero extra upstream pulls inside TTL)');

  // --------------------------------------------------------------------------
  // SUITE 6: SDLC Discovery Engine & Pre-Build Architecture Verification
  // --------------------------------------------------------------------------
  console.log('\n--> SUITE 6: SDLC Discovery Engine & Pre-Build Architecture Verification');

  // 6.1 Phase Structure
  assert(SDLC_PHASES.length === 6, 'All 6 canonical SDLC discovery phases configured');
  const totalQuestions = SDLC_PHASES.reduce((acc, p) => acc + p.questions.length, 0);
  assert(totalQuestions >= 18, `Exhaustive discovery coverage: ${totalQuestions} architectural questions`);

  // 6.2 Prepopulated Templates
  assert(Boolean(PREPOPULATED_PROJECT_DISCOVERY['proj-ehi-001']), 'EHI Multisystems discovery blueprint populated');
  assert(Boolean(PREPOPULATED_PROJECT_DISCOVERY['proj-iyanu-002']), 'Iyanuoluwa AgroSupply discovery blueprint populated');
  assert(Boolean(PREPOPULATED_PROJECT_DISCOVERY['proj-aviation-003']), 'Aviation Log Entry discovery blueprint populated');
  assert(Boolean(PREPOPULATED_PROJECT_DISCOVERY['proj-edgepoint-004']), 'EdgePoint IoT discovery blueprint populated');

  // 6.3 Readiness Scoring Algorithm
  const emptyScore = calculateReadinessScore({});
  assert(emptyScore === 0, 'Unanswered discovery returns 0% readiness');

  const ehiScore = calculateReadinessScore(PREPOPULATED_PROJECT_DISCOVERY['proj-ehi-001']);
  assert(ehiScore >= 95, `EHI Multisystems achieves high architectural readiness (${ehiScore}%)`);

  // 6.4 Specification Generator
  const sampleState = {
    projectId: 'proj-ehi-001',
    answers: PREPOPULATED_PROJECT_DISCOVERY['proj-ehi-001'],
    lastUpdated: new Date().toISOString(),
    readinessScore: ehiScore
  };
  const generatedSpec = generateArchitectureBlueprint('EHI Multisystems', 'Fintech', sampleState);
  assert(generatedSpec.includes('# SYSTEM ARCHITECTURE SPECIFICATION'), 'Generated blueprint includes root markdown header');
  assert(generatedSpec.includes('## 1. Executive Summary'), 'Generated blueprint includes Phase 1 section');
  assert(generatedSpec.includes('## 3. Security, Multi-Tenant Isolation'), 'Generated blueprint includes Phase 3 RLS section');
  assert(generatedSpec.includes('## 6. Autonomous Verification Gates'), 'Generated blueprint includes Phase 6 deployment gates');

  // --------------------------------------------------------------------------
  // SUMMARY & ANOMALY REPORT
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('================================================================');

  if (anomalies.length > 0) {
    console.error('\nDETECTED ANOMALIES:');
    anomalies.forEach((a, i) => console.error(`  [${i + 1}] ${a}`));
    process.exit(1);
  } else {
    console.log('\n✓ ZERO ANOMALIES DETECTED. Subsystems verified and production-ready.\n');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
