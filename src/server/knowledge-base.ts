/**
 * Knowledge base construction (Sprint 6) — ported from
 * `services/knowledge_base.py`.
 *
 * Builds a glossary of domain terms from SOP text via (1) explicit definitions
 * (`Term: meaning`, `Term means ...`) and (2) recurring capitalized phrases /
 * acronyms, which get a synthesized "referenced N times" definition.
 */

import type { KnowledgeEntry } from "@/lib/types";

const DEFINITION_PATTERNS = [
  /^\s*([A-Z][\w /-]{1,40})\s*[:\-]\s+(.{5,240})$/,
  /\b([A-Z][\w -]{1,40})\s+(?:means|refers to|is defined as)\s+(.{5,240})/,
];

const ACRONYM = /\b([A-Z]{2,6})\b/g;
const CAP_PHRASE = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;

const STOPWORDS = new Set(["The", "This", "That", "These", "Standard Operating"]);

export function buildKnowledgeBase(text: string, limit = 25): KnowledgeEntry[] {
  const entries = new Map<string, KnowledgeEntry>();

  // 1. Explicit definitions.
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    for (const pattern of DEFINITION_PATTERNS) {
      const match = pattern.exec(line);
      if (match) {
        const term = match[1].trim();
        const definition = match[2].replace(/\s+/g, " ").replace(/[.\s]+$/, "");
        if (term && !STOPWORDS.has(term)) {
          entries.set(term.toLowerCase(), {
            term,
            definition,
            occurrences: 1,
          });
        }
        break;
      }
    }
  }

  // 2. Recurring capitalized phrases / acronyms.
  const counts = new Map<string, number>();
  const bump = (term: string) => {
    if (STOPWORDS.has(term)) return;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  };
  for (const m of text.matchAll(CAP_PHRASE)) bump(m[1]);
  for (const m of text.matchAll(ACRONYM)) bump(m[1]);

  for (const [term, count] of counts) {
    const key = term.toLowerCase();
    const existing = entries.get(key);
    if (existing) {
      existing.occurrences = Math.max(existing.occurrences, count);
    } else if (count >= 2) {
      entries.set(key, {
        term,
        definition: `Referenced ${count} times in this document.`,
        occurrences: count,
      });
    }
  }

  return [...entries.values()]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, limit);
}
