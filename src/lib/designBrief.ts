import {
  DESIGN_KIT_PRESETS,
  BLANK_PRESET_ID,
  DesignKitPreset,
  DomainCopyEntry,
  getBlankPreset,
  getDesignKitPreset
} from '../data/designKitPresets';

/** kit_id of a brief whose kit no longer matches any preset. */
export const CUSTOM_KIT_ID = 'custom';

export type DesignBriefStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export interface ReferenceItem {
  id: string;
  source: string; // URL, document name, or screenshot descriptor
  what_to_steal: string; // Exactly one sentence describing what structural grammar to adopt
  what_to_leave: string; // What consumer or generic element to strictly discard
}

export interface GoldenScreenConfig {
  screen_name: string;
  fields: [string, string, string, string, string]; // exactly five core fields from golden path
}

export interface TypeAndVoice {
  display_face: string;
  text_face: string;
  mono_face: string;
  sample_strings: [string, string, string]; // Three sample strings written in domain nouns
}

export interface TokenDelta {
  accent_color: string;
  paper_color: string;
  density: 'compact' | 'comfortable' | 'dense_rugged';
  custom_css?: string;
}

export interface DesignBrief {
  project_id: string;
  kit_id: string; // preset the kit was copied from (provenance only), or 'custom'
  kit_name: string; // display name of the copied kit
  screen_grammar: string;
  signature_object: string; // The physical or logical object operator holds (Ticket, debt line, log entry, sensor node)
  golden_screen: GoldenScreenConfig;
  setting: string; // yard, ward, cockpit, tower. Lighting, distance, gloves or desk
  references: ReferenceItem[]; // Exactly three required
  forbidden: string[]; // At least five required
  type_and_voice: TypeAndVoice;
  token_delta: TokenDelta;
  copy_deck: DomainCopyEntry[]; // contract nouns for prompts; may be empty
  golden_template_html?: string; // golden screen HTML with {{projectName}}; missing = neutral skeleton
  status: DesignBriefStatus;
  reject_reason?: string;
  approved_fixture_hash?: string;
  updated_at: string;
}

/**
 * Deterministic hash calculation for Golden Screen fixture approval validation
 */
export function computeFixtureHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to 16-character hex representation
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const len = content.length.toString(16).padStart(4, '0');
  return `fix-v1-${hex}${len}`;
}

/**
 * Builds a brief by COPYING a preset into the project (copy on pick).
 * Unknown or missing preset ids fall back to Blank; nothing is guessed from
 * the project id, name or vertical.
 */
export function createBriefFromPreset(projectId: string, presetId?: string | null): DesignBrief {
  const preset = getDesignKitPreset(presetId) ?? getBlankPreset();
  return {
    project_id: projectId,
    ...briefFieldsFromPreset(preset),
    status: 'draft',
    updated_at: new Date().toISOString()
  };
}

/**
 * Default brief for a project that has none yet. `presetId` is the project's
 * chosen preset when the data layer provides one; otherwise Blank.
 */
export function createDefaultBrief(projectId: string, presetId?: string | null): DesignBrief {
  return createBriefFromPreset(projectId, presetId);
}

/**
 * Replaces the project's kit with a fresh copy of a preset. The brief goes
 * back to draft, because the approved fixture no longer matches.
 */
export function applyPresetToBrief(brief: DesignBrief, presetId: string): DesignBrief {
  const preset = getDesignKitPreset(presetId) ?? getBlankPreset();
  return {
    ...brief,
    ...briefFieldsFromPreset(preset),
    status: 'draft',
    reject_reason: undefined,
    approved_fixture_hash: undefined
  };
}

function briefFieldsFromPreset(preset: DesignKitPreset) {
  const kit = preset.kit;
  return {
    kit_id: preset.id,
    kit_name: preset.name,
    screen_grammar: kit.screenGrammar,
    signature_object: kit.signatureObject,
    golden_screen: {
      screen_name: kit.goldenScreen.name,
      fields: [...kit.goldenScreen.fields] as GoldenScreenConfig['fields']
    },
    golden_template_html: kit.goldenScreen.templateHtml,
    setting: kit.setting,
    references: kit.references.map((ref, i) => ({
      id: `ref-${i + 1}`,
      source: ref.source,
      what_to_steal: ref.whatToSteal,
      what_to_leave: ref.whatToLeave
    })),
    forbidden: [...kit.forbidden],
    type_and_voice: {
      display_face: kit.typography.display,
      text_face: kit.typography.text,
      mono_face: kit.typography.mono,
      sample_strings: [...kit.sampleCopy] as TypeAndVoice['sample_strings']
    },
    token_delta: {
      accent_color: kit.tokens.accent,
      paper_color: kit.tokens.paper,
      density: kit.tokens.density
    },
    copy_deck: kit.copyDeck.map((entry) => ({ ...entry }))
  };
}

/**
 * Briefs saved before kits became presets only stored the kit's id and some
 * copied fields. Fill in the fields that used to be read live from the kit,
 * by matching the preset whose signature object the brief copied. Anything
 * that doesn't match keeps its own fields and gets Blank's empty extras.
 */
function normalizeStoredBrief(parsed: DesignBrief): DesignBrief {
  if (typeof parsed.kit_name === 'string' && Array.isArray(parsed.copy_deck)) {
    return parsed;
  }
  const match = DESIGN_KIT_PRESETS.find(
    (p) => p.id !== BLANK_PRESET_ID && p.kit.signatureObject === parsed.signature_object
  );
  const source = match ?? getBlankPreset();
  return {
    ...parsed,
    kit_id: match ? match.id : CUSTOM_KIT_ID,
    kit_name: match ? match.name : 'Custom kit',
    screen_grammar: parsed.screen_grammar ?? source.kit.screenGrammar,
    golden_template_html: parsed.golden_template_html ?? source.kit.goldenScreen.templateHtml,
    copy_deck: source.kit.copyDeck.map((entry) => ({ ...entry }))
  };
}

const STORAGE_PREFIX = 'geosan_design_brief_';

export function getDesignBrief(projectId: string, presetId?: string | null): DesignBrief {
  if (typeof localStorage === 'undefined') {
    return createDefaultBrief(projectId, presetId);
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.project_id === projectId) {
        return normalizeStoredBrief(parsed);
      }
    }
  } catch {}

  const defaultBrief = createDefaultBrief(projectId, presetId);
  saveDesignBrief(defaultBrief);
  return defaultBrief;
}

export function saveDesignBrief(brief: DesignBrief): void {
  if (typeof localStorage === 'undefined') return;
  try {
    brief.updated_at = new Date().toISOString();
    localStorage.setItem(`${STORAGE_PREFIX}${brief.project_id}`, JSON.stringify(brief));
  } catch {}
}

export function isDesignBriefApproved(projectId: string): boolean {
  const brief = getDesignBrief(projectId);
  return brief.status === 'approved' && Boolean(brief.approved_fixture_hash);
}

export function approveDesignBrief(
  projectId: string,
  fixtureHash: string
): { success: boolean; error?: string } {
  const brief = getDesignBrief(projectId);

  if (brief.references.length !== 3) {
    return { success: false, error: 'Exactly three references with "steal" and "leave" required.' };
  }
  for (const ref of brief.references) {
    if (!ref.what_to_steal?.trim() || !ref.what_to_leave?.trim()) {
      return { success: false, error: 'Every reference must contain both "what to steal" and "what to leave".' };
    }
  }

  if (brief.forbidden.length < 5) {
    return { success: false, error: 'At least five forbidden anti-patterns must be listed.' };
  }

  brief.status = 'approved';
  brief.approved_fixture_hash = fixtureHash;
  brief.reject_reason = undefined;
  saveDesignBrief(brief);

  return { success: true };
}

export function rejectDesignBrief(projectId: string, reason: string): void {
  const brief = getDesignBrief(projectId);
  brief.status = 'rejected';
  brief.reject_reason = reason.trim() || 'Did not meet domain fidelity or violated slop critic guidelines.';
  saveDesignBrief(brief);
}
