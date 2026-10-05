import { VERTICAL_KITS, VerticalKit } from '../data/verticalKits';

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
  kit_id: 'iyanuoluwa' | 'ehi' | 'aviation' | 'edgepoint';
  signature_object: string; // The physical or logical object operator holds (Ticket, debt line, log entry, sensor node)
  golden_screen: GoldenScreenConfig;
  setting: string; // yard, ward, cockpit, tower. Lighting, distance, gloves or desk
  references: ReferenceItem[]; // Exactly three required
  forbidden: string[]; // At least five required
  type_and_voice: TypeAndVoice;
  token_delta: TokenDelta;
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
 * Maps project ID or vertical name to appropriate kit
 */
export function resolveKitForProject(projectId: string, vertical?: string): 'iyanuoluwa' | 'ehi' | 'aviation' | 'edgepoint' {
  const p = (projectId || '').toLowerCase();
  const v = (vertical || '').toLowerCase();

  if (p.includes('iya') || v.includes('agri') || v.includes('agro') || v.includes('silo')) {
    return 'iyanuoluwa';
  }
  if (p.includes('aero') || p.includes('avia') || v.includes('avia') || v.includes('flight')) {
    return 'aviation';
  }
  if (p.includes('edge') || v.includes('iot') || v.includes('mesh') || v.includes('treasury')) {
    return 'edgepoint';
  }
  return 'ehi';
}

/**
 * Default empty/draft brief initialized from a vertical kit
 */
export function createDefaultBrief(projectId: string, vertical?: string): DesignBrief {
  const kitKey = resolveKitForProject(projectId, vertical);
  const kit = VERTICAL_KITS[kitKey];

  return {
    project_id: projectId,
    kit_id: kitKey,
    signature_object: kit.signatureObject,
    golden_screen: {
      screen_name: `${kit.signatureObject} Primary View`,
      fields: [
        kit.contractNouns[0] || 'identifier',
        kit.contractNouns[1] || 'primary_metric',
        kit.contractNouns[2] || 'secondary_metric',
        kit.contractNouns[3] || 'status_flag',
        kit.contractNouns[4] || 'audit_timestamp'
      ]
    },
    setting: kit.setting,
    references: [
      {
        id: 'ref-1',
        source: 'Federal Aviation/Transport Physical Waybill & Stamp Paper Archive',
        what_to_steal: 'High-density physical carbon-copy grid with indelible stamp watermark.',
        what_to_leave: 'Leave behind any glossy marketing banners or multi-level navigational menus.'
      },
      {
        id: 'ref-2',
        source: 'Bloomberg Terminal & Reuters Forex Settlement Grid (Monochrome Layout)',
        what_to_steal: 'Monospace tabular columns with strict number alignment and zero layout shift.',
        what_to_leave: 'Leave behind pastel color gradients and playful rounded pill buttons.'
      },
      {
        id: 'ref-3',
        source: 'Siemens Ruggedized SCADA & Telemetry Industrial Panel (EN 60947)',
        what_to_steal: 'Single-glance high-contrast status beacons with unambiguous fault indicators.',
        what_to_leave: 'Leave behind celebratory confetti, gamified progress bars, or onboarding tutorials.'
      }
    ],
    forbidden: [...kit.defaultForbidden],
    type_and_voice: {
      display_face: kit.recommendedTypography.displayFace,
      text_face: kit.recommendedTypography.textFace,
      mono_face: kit.recommendedTypography.monoFace,
      sample_strings: [...kit.sampleCopy]
    },
    token_delta: {
      accent_color: kit.defaultTokens.accentColor,
      paper_color: kit.defaultTokens.paperColor,
      density: kit.defaultTokens.density
    },
    status: 'draft',
    updated_at: new Date().toISOString()
  };
}

const STORAGE_PREFIX = 'geosan_design_brief_';

export function getDesignBrief(projectId: string, vertical?: string): DesignBrief {
  if (typeof localStorage === 'undefined') {
    return createDefaultBrief(projectId, vertical);
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.project_id === projectId) {
        return parsed;
      }
    }
  } catch {}

  const defaultBrief = createDefaultBrief(projectId, vertical);
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
