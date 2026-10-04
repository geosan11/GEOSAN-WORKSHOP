/**
 * Slop Critic — Deterministic Zero-Cost Design Linter
 *
 * Enforces anti-AI-slop rules on Design Briefs and Golden Screen Fixtures.
 * Runs completely deterministically without LLM token cost.
 */

import { DesignBrief } from './designBrief';

export interface SlopViolation {
  code: string;
  severity: 'blocker' | 'warning';
  title: string;
  message: string;
  location?: string;
}

export interface SlopCriticResult {
  passed: boolean;
  score: number; // 0 to 100
  violations: SlopViolation[];
  summary: string;
}

const FORBIDDEN_WORDS = ['Welcome', 'Unlock', 'Seamless', 'Next-gen', 'Manage your'];
const FORBIDDEN_DISPLAY_FACES = ['inter', 'roboto', 'arial', 'helvetica'];
const FORBIDDEN_ACCENTS = ['#6366f1', '#8b5cf6', '#4f46e5', '#7c3aed', 'indigo', 'purple'];

export function lintDesignBriefAndFixture(
  brief: DesignBrief,
  fixtureHtml?: string
): SlopCriticResult {
  const violations: SlopViolation[] = [];

  // RULE 1: Exactly 3 references with steal and leave
  if (!brief.references || brief.references.length !== 3) {
    violations.push({
      code: 'REF_COUNT_INVALID',
      severity: 'blocker',
      title: 'Reference Count Violation',
      message: `Must contain exactly 3 pinned references. Found: ${brief.references?.length || 0}.`
    });
  } else {
    brief.references.forEach((ref, idx) => {
      if (!ref.what_to_steal || ref.what_to_steal.trim().length < 10) {
        violations.push({
          code: 'REF_MISSING_STEAL',
          severity: 'blocker',
          title: `Reference #${idx + 1} Missing "What to Steal"`,
          message: 'Every reference must have a concise sentence explaining what structural grammar to adopt.'
        });
      }
      if (!ref.what_to_leave || ref.what_to_leave.trim().length < 5) {
        violations.push({
          code: 'REF_MISSING_LEAVE',
          severity: 'blocker',
          title: `Reference #${idx + 1} Missing "What to Leave"`,
          message: 'Every reference must specify what generic or consumer element to strictly discard.'
        });
      }
    });
  }

  // RULE 2: At least 5 forbidden slop items
  if (!brief.forbidden || brief.forbidden.length < 5) {
    violations.push({
      code: 'FORBIDDEN_COUNT_LOW',
      severity: 'blocker',
      title: 'Forbidden List Incomplete',
      message: `Must list at least 5 anti-patterns. Currently listed: ${brief.forbidden?.length || 0}.`
    });
  }

  // RULE 3: Display Face must not be generic Inter / Roboto / Arial
  const displayFace = (brief.type_and_voice.display_face || '').toLowerCase();
  if (FORBIDDEN_DISPLAY_FACES.some((f) => displayFace.includes(f))) {
    violations.push({
      code: 'GENERIC_DISPLAY_FACE',
      severity: 'blocker',
      title: 'Generic Display Typography Prohibited',
      message: `Display face cannot be "${brief.type_and_voice.display_face}". Use characterful domain-specific type (e.g., Outfit, JetBrains Mono, Space Grotesk).`
    });
  }

  // RULE 4: No purple or indigo accent
  const accent = (brief.token_delta.accent_color || '').toLowerCase();
  if (FORBIDDEN_ACCENTS.some((c) => accent.includes(c))) {
    violations.push({
      code: 'PURPLE_INDIGO_ACCENT',
      severity: 'blocker',
      title: 'Purple / Indigo SaaS Accent Prohibited',
      message: `Found forbidden accent color: "${brief.token_delta.accent_color}". Use grounded operational color (e.g. emerald, amber, sky, cyan).`
    });
  }

  // RULE 5: Signature object cannot be "dashboard"
  const sig = (brief.signature_object || '').toLowerCase();
  if (sig.includes('dashboard') || sig.includes('portal') || sig.includes('overview')) {
    violations.push({
      code: 'INVALID_SIGNATURE_OBJECT',
      severity: 'blocker',
      title: 'Invalid Signature Object',
      message: 'Signature object must be a real physical or domain object (e.g., Ticket, debt line, log entry, sensor node), NOT a "dashboard".'
    });
  }

  // Fixture HTML Linter (if fixture provided)
  if (fixtureHtml) {
    const lowerHtml = fixtureHtml.toLowerCase();

    // Check for Three equal stat cards in a row as the first view
    if (
      (lowerHtml.includes('grid-cols-3') && lowerHtml.includes('stat')) ||
      (lowerHtml.includes('stat-card') && lowerHtml.split('stat-card').length >= 4)
    ) {
      violations.push({
        code: 'THREE_STAT_CARDS',
        severity: 'blocker',
        title: 'Three Stat Cards in a Row Prohibited',
        message: 'Golden screen fixture starts with generic 3-card stat grid. Lead with the signature object instead.'
      });
    }

    // Check for Gradient background
    if (
      lowerHtml.includes('bg-gradient') ||
      lowerHtml.includes('linear-gradient') ||
      lowerHtml.includes('radial-gradient')
    ) {
      violations.push({
        code: 'GRADIENT_BACKGROUND',
        severity: 'blocker',
        title: 'Gradient Background Prohibited',
        message: 'Golden screen contains gradient background. Use solid high-contrast paper color.'
      });
    }

    // Check for Forbidden Words
    FORBIDDEN_WORDS.forEach((word) => {
      if (fixtureHtml.includes(word)) {
        violations.push({
          code: 'FORBIDDEN_BUZZWORD',
          severity: 'blocker',
          title: `Forbidden Buzzword "${word}"`,
          message: `The word "${word}" was found in golden screen copy. Replace with precise domain nouns.`
        });
      }
    });

    // Check for Slop Empty State
    if (
      lowerHtml.includes('get started') &&
      (lowerHtml.includes('empty') || lowerHtml.includes('no data'))
    ) {
      violations.push({
        code: 'SLOP_EMPTY_STATE',
        severity: 'blocker',
        title: 'Generic Empty State Prohibited',
        message: 'Empty state with single CTA "Get started" detected. Provide concrete domain action.'
      });
    }

    // Check for Generic SaaS Sidebar
    if (
      lowerHtml.includes('sidebar') &&
      lowerHtml.includes('dashboard') &&
      lowerHtml.includes('analytics') &&
      lowerHtml.includes('settings')
    ) {
      violations.push({
        code: 'GENERIC_SAAS_SIDEBAR',
        severity: 'blocker',
        title: 'Generic SaaS Sidebar Prohibited',
        message: 'Detected generic sidebar containing "Dashboard", "Analytics", "Settings". Use domain-specific navigation.'
      });
    }
  }

  const blockers = violations.filter((v) => v.severity === 'blocker');
  const passed = blockers.length === 0;
  const score = Math.max(0, 100 - blockers.length * 20 - (violations.length - blockers.length) * 5);

  let summary = 'Pass: Design brief conforms strictly to anti-slop guidelines.';
  if (!passed) {
    summary = `Failed with ${blockers.length} blocker issue(s): ${blockers.map((b) => b.title).join('; ')}`;
  }

  return {
    passed,
    score,
    violations,
    summary
  };
}
