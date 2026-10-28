/**
 * Deterministic Zero-Cost Design Linter (Slop Critic CLI & Test Suite)
 *
 * Enforces anti-AI-slop rules on Design Briefs and Golden Screen Fixtures.
 * Runs completely deterministically without model spend.
 */

import { DESIGN_KIT_PRESETS, BLANK_PRESET_ID } from '../src/data/designKitPresets';
import { createBriefFromPreset, applyPresetToBrief, CUSTOM_KIT_ID } from '../src/lib/designBrief';
import { generateGoldenScreenHtml } from '../src/lib/goldenFixtures';
import { lintDesignBriefAndFixture } from '../src/lib/slopCritic';
import { validatePromptDomainVocabulary } from '../src/lib/copyDeck';

function runDesignLinter() {
  console.log('================================================================');
  console.log('       GEOSAN-WORKSHOP — DETERMINISTIC SLOP CRITIC LINT        ');
  console.log('================================================================');

  let passedAll = true;

  // 1. Every built-in preset (except Blank) passes the slop critic once copied into a project
  for (const preset of DESIGN_KIT_PRESETS) {
    if (preset.id === BLANK_PRESET_ID) continue;
    const brief = createBriefFromPreset(`test-${preset.id}`, preset.id);
    const html = generateGoldenScreenHtml(brief, preset.name);
    const result = lintDesignBriefAndFixture(brief, html);

    if (result.passed) {
      console.log(`✓ [PASS] Preset "${preset.id}": Score ${result.score}% · Zero anti-patterns detected`);
    } else {
      passedAll = false;
      console.error(`✗ [FAIL] Preset "${preset.id}": ${result.summary}`);
      result.violations.forEach((v) => console.error(`   - [${v.code}] ${v.title}: ${v.message}`));
    }
  }

  // 1b. Blank renders a clean skeleton fixture, and its brief is NOT approvable as-is
  {
    const blank = createBriefFromPreset('test-blank', BLANK_PRESET_ID);
    const html = generateGoldenScreenHtml(blank, 'Project <Blank> & Co');
    const fixtureOnly = lintDesignBriefAndFixture(
      { ...blank, references: createBriefFromPreset('x', DESIGN_KIT_PRESETS[0].id).references, forbidden: ['a', 'b', 'c', 'd', 'e'], signature_object: 'Delivery note' },
      html
    );
    const asIs = lintDesignBriefAndFixture(blank, html);
    const escaped = html.includes('Project &lt;Blank&gt; &amp; Co') && !html.includes('<Blank>');
    if (fixtureOnly.passed && !asIs.passed && escaped) {
      console.log('✓ [PASS] Blank preset: skeleton fixture is clean, escapes the project name, and the empty brief is blocked until filled in.');
    } else {
      passedAll = false;
      console.error('✗ [FAIL] Blank preset skeleton or gating is wrong.');
      fixtureOnly.violations.forEach((v) => console.error(`   - [${v.code}] ${v.title}: ${v.message}`));
    }
  }

  // 1c. A generated custom kit (an edited copy of a preset) still passes, and editing it never mutates the preset
  {
    const source = DESIGN_KIT_PRESETS[0];
    const before = JSON.stringify(source);
    const custom = applyPresetToBrief(createBriefFromPreset('test-custom', BLANK_PRESET_ID), source.id);
    custom.kit_id = CUSTOM_KIT_ID;
    custom.kit_name = 'Custom delivery-note kit';
    custom.signature_object = 'Delivery note DN-XXXX';
    custom.golden_template_html = undefined;
    custom.token_delta.accent_color = '#E11D48';
    custom.forbidden.push('Generic "order" instead of delivery note');
    custom.copy_deck = [{ noun: 'delivery_note_id', category: 'identifier', definition: 'Printed note number', sampleString: 'DN-0042' }];
    const result = lintDesignBriefAndFixture(custom, generateGoldenScreenHtml(custom, 'Custom Project'));
    const presetUntouched = JSON.stringify(source) === before;
    if (result.passed && presetUntouched) {
      console.log('✓ [PASS] Custom kit: edited copy passes and the source preset is unchanged (copy on pick).');
    } else {
      passedAll = false;
      console.error(`✗ [FAIL] Custom kit: passed=${result.passed} presetUntouched=${presetUntouched}`);
      result.violations.forEach((v) => console.error(`   - [${v.code}] ${v.title}: ${v.message}`));
    }
  }

  // 2. Adversarial Test: Sloppy fixture with 3 stat cards, gradient, buzzword, purple accent
  console.log('\n--> Running Adversarial Test on Intentional Slop Fixture...');
  const sloppyBrief = createBriefFromPreset('test-slop', DESIGN_KIT_PRESETS[0].id);
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

  const weighbridgeDeck = createBriefFromPreset('test-deck', 'weighbridge-ticket').copy_deck;
  const checkGeneric = validatePromptDomainVocabulary(genericPrompt, weighbridgeDeck);
  const checkDomain = validatePromptDomainVocabulary(domainPrompt, weighbridgeDeck);
  const checkEmptyDeck = validatePromptDomainVocabulary(genericPrompt, []);

  if (weighbridgeDeck.length > 0 && !checkGeneric.valid && checkDomain.valid && checkEmptyDeck.valid) {
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
