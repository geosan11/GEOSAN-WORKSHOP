/**
 * Copy Deck — Domain Contract Nouns & Anti-Generic Prompt Validator
 *
 * The deck itself lives on each project's design brief (copied from a preset).
 *
 * Ensures chat and plan prompts use grounded contract nouns instead of
 * generic SaaS placeholders like "user", "item", "data", "admin".
 */

import type { DomainCopyEntry } from '../data/designKitPresets';

export type { DomainCopyEntry };

const GENERIC_SLOP_NOUNS = ['user', 'item', 'product', 'dashboard', 'entity', 'thing', 'stuff', 'admin'];

export function validatePromptDomainVocabulary(
  prompt: string,
  deck: DomainCopyEntry[]
): { valid: boolean; violationReason?: string } {
  // A project whose kit has no copy deck has no contract nouns to enforce.
  if (deck.length === 0) return { valid: true };
  const lower = prompt.toLowerCase();
  const domainNouns = deck.map((d) => d.noun.toLowerCase());

  // Check if prompt uses generic "user" or "item" without domain nouns
  const hasGenericSlop = GENERIC_SLOP_NOUNS.some((slop) => {
    const regex = new RegExp(`\\b${slop}\\b`, 'i');
    return regex.test(lower);
  });

  const hasDomainNoun = domainNouns.some((n) => lower.includes(n.replace(/_/g, ' ')) || lower.includes(n));

  if (hasGenericSlop && !hasDomainNoun) {
    return {
      valid: false,
      violationReason: `Plan prompt rejected in Ask mode: uses generic terms ("user", "item", "dashboard") where contract requires domain nouns (${domainNouns.slice(0, 4).join(', ')}).`
    };
  }

  return { valid: true };
}
