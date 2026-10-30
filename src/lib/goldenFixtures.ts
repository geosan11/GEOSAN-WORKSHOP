/**
 * Golden Screen Fixture Generator & Storage
 *
 * Renders the signature object with real contract fields (docs/CONTRACT.md)
 * without generic cards or marketing slop.
 *
 * The HTML comes from the project's own design brief (a copy of a preset's
 * template, see data/designKitPresets.ts). A brief with no template renders a
 * neutral skeleton from its signature object, golden-screen fields and tokens.
 */

import { computeFixtureHash, DesignBrief } from './designBrief';

export interface GoldenFixtureInfo {
  project_id: string;
  project_slug: string;
  signature_object: string;
  html_content: string;
  fixture_hash: string;
  created_at: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Fills a preset template's `{{projectName}}` placeholder. */
export function fillGoldenTemplate(templateHtml: string, projectName: string): string {
  return templateHtml.split('{{projectName}}').join(escapeHtml(projectName));
}

/** Neutral skeleton used by Blank and by any kit without its own template. */
export function renderSkeletonGoldenScreen(
  brief: Pick<DesignBrief, 'signature_object' | 'golden_screen' | 'token_delta'>,
  projectName: string
): string {
  const accent = escapeHtml(brief.token_delta.accent_color || '#64748B');
  const paper = escapeHtml(brief.token_delta.paper_color || '#0D1117');
  const objectName = escapeHtml(brief.signature_object || 'Signature object not set');
  const rows = brief.golden_screen.fields
    .map(
      (field) =>
        `    <div class="row"><span class="label">${escapeHtml(field)}</span><span class="val">—</span></div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${objectName} — ${escapeHtml(projectName)}</title>
  <style>
    body { background: ${paper}; color: #E2E8F0; font-family: 'JetBrains Mono', monospace; margin: 0; padding: 24px; }
    .frame { max-width: 640px; margin: 0 auto; border: 1px dashed ${accent}; padding: 20px; }
    .object { font-size: 16px; font-weight: 800; color: ${accent}; border-bottom: 1px solid ${accent}; padding-bottom: 10px; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted rgba(255,255,255,0.15); font-size: 12px; }
    .label { color: #94A3B8; text-transform: uppercase; font-size: 11px; }
    .val { color: #F8FAFC; font-weight: 700; }
    .note { margin-top: 14px; font-size: 11px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="frame">
    <div class="object">${objectName}</div>
${rows}
    <div class="note">Skeleton golden screen. Pick a preset or describe the signature object to replace it.</div>
  </div>
</body>
</html>`;
}

export function generateGoldenScreenHtml(brief: DesignBrief, projectName: string): string {
  if (brief.golden_template_html) {
    return fillGoldenTemplate(brief.golden_template_html, projectName);
  }
  return renderSkeletonGoldenScreen(brief, projectName);
}

export function getOrCreateGoldenFixture(
  projectId: string,
  projectName: string,
  brief: DesignBrief
): GoldenFixtureInfo {
  const slug = projectId.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const html = generateGoldenScreenHtml(brief, projectName);
  const hash = computeFixtureHash(html);

  return {
    project_id: projectId,
    project_slug: slug,
    signature_object: brief.signature_object,
    html_content: html,
    fixture_hash: hash,
    created_at: new Date().toISOString()
  };
}
