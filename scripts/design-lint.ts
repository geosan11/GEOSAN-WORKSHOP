/**
 * Deterministic Zero-Cost Design Linter (Slop Critic CLI & Test Suite)
 *
 * Enforces anti-AI-slop rules on Design Briefs and Golden Screen Fixtures.
 * Runs completely deterministically without model spend.
 */

import { VERTICAL_KITS } from '../src/data/verticalKits';
import { createDefaultBrief, computeFixtureHash } from '../src/lib/designBrief';
import { generateGoldenScreenHtml } from '../src/lib/goldenFixtures';
import { lintDesignBriefAndFixture } from '../src/lib/slopCritic';
import { validatePromptDomainVocabulary } from '../src/lib/copyDeck';

function runDesignLinter() {
  console.log('================================================================');
  console.log('       GEOSAN-WORKSHOP — DETERMINISTIC SLOP CRITIC LINT        ');
  console.log('================================================================');

  let passedAll = true;

  // 1. Verify all 4 vertical kits pass slop critic
  const kits = ['iyanuoluwa', 'ehi', 'aviation', 'edgepoint'] as const;

  for (const kitId of kits) {
    const kit = VERTICAL_KITS[kitId];
    const brief = createDefaultBrief(`test-${kitId}`, kitId);
    const html = generateGoldenScreenHtml(kitId, kit.verticalName);
    const result = lintDesignBriefAndFixture(brief, html);

    if (result.passed) {
      console.log(`✓ [PASS] Vertical Kit "${kitId}": Score ${result.score}% · Zero anti-patterns detected`);
    } else {
      passedAll = false;
      console.error(`✗ [FAIL] Vertical Kit "${kitId}": ${result.summary}`);
      result.violations.forEach((v) => console.error(`   - [${v.code}] ${v.title}: ${v.message}`));
    }
  }

  // 2. Adversarial Test: Sloppy fixture with 3 stat cards, gradient, buzzword, purple accent
  console.log('\n--> Running Adversarial Test on Intentional Slop Fixture...');
  const sloppyBrief = createDefaultBrief('test-slop', 'ehi');
  sloppyBrief.type_and_voice.display_face = 'Inter'; // forbidden display face
  sloppyBrief.token_delta.accent_color = '#6366f1'; // forbidden indigo
  sloppyBrief.signature_object = 'Analytics Dashboard'; // forbidden "dashboard"
  sloppyBrief.forbidden = ['Only one item']; // fewer than 5

  const sloppyHtml = `
    <html>
      <body class="bg-gradient-to-r from-purple-500 to-indigo-600">
        <h1>Welcome to our Next-gen Seamless Platform</h1>
        <div class="grid grid-cols-3 gap-4">
          <div class="stat-card">Stat 1</div>
          <div class="stat-card">Stat 2</div>
          <div class="stat-card">Stat 3</div>
        </div>
        <div class="empty">
          <button>Get started</button>
        </div>
        <div class="sidebar">
          <a>Dashboard</a>
          <a>Analytics</a>
          <a>Settings</a>
        </div>
      </body>
    </html>
  `;

  const adversarialResult = lintDesignBriefAndFixture(sloppyBrief, sloppyHtml);

  if (!adversarialResult.passed && adversarialResult.violations.length >= 6) {
    console.log(`✓ [PASS] Adversarial Slop Caught: Detected ${adversarialResult.violations.length} blocker violations.`);
  } else {
    passedAll = false;
    console.error('✗ [FAIL] Adversarial slop was NOT adequately blocked.');
  }

  // 3. Verify Prompt Domain Vocabulary Gate
  console.log('\n--> Running Copy Deck Vocabulary Gate Checks...');
  const genericPrompt = 'The user clicks on the item on the dashboard to see data';
  const domainPrompt = 'The operator weighs the truck_plate and certifies gross_weight_kg on ticket_number';

  const checkGeneric = validatePromptDomainVocabulary(genericPrompt, 'iyanuoluwa');
  const checkDomain = validatePromptDomainVocabulary(domainPrompt, 'iyanuoluwa');

  if (!checkGeneric.valid && checkDomain.valid) {
    console.log('✓ [PASS] Copy Deck correctly rejected generic "user/item/dashboard" and admitted domain nouns.');
  } else {
    passedAll = false;
    console.error('✗ [FAIL] Copy Deck vocabulary gate failed.');
  }

  console.log('\n================================================================');
  if (passedAll) {
    console.log('  ALL DETERMINISTIC DESIGN LINT & SLOP CRITIC CHECKS PASSED  ');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error('  SOME DESIGN LINT CHECKS FAILED  ');
    console.log('================================================================\n');
    process.exit(1);
  }
}

runDesignLinter();
