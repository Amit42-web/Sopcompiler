/**
 * SOP metadata extraction (Sprint 6) — ported from `services/metadata.py`.
 *
 * Pulls document-level metadata (title, department, version, effective date,
 * owner) from the header region using labelled-field heuristics, plus topical
 * tags derived from keyword presence.
 */

import type { SopMetadata } from "@/lib/types";

type MetaField = "title" | "department" | "version" | "effective_date" | "owner";

const FIELD_PATTERNS: [MetaField, RegExp][] = [
  ["department", /^\s*department\s*[:\-]\s*(.+)$/i],
  ["version", /^\s*(?:version|revision|rev)\s*[:\-]?\s*v?\s*([\w.]+)$/i],
  ["effective_date", /^\s*(?:effective(?:\s+date)?|date)\s*[:\-]\s*(.+)$/i],
  ["owner", /^\s*(?:owner|author|approved by|prepared by)\s*[:\-]\s*(.+)$/i],
  ["title", /^\s*(?:title|sop title|document)\s*[:\-]\s*(.+)$/i],
];

const TAG_KEYWORDS: [string, string][] = [
  ["refund", "refunds"],
  ["onboard", "onboarding"],
  ["complian", "compliance"],
  ["security", "security"],
  ["approval", "approvals"],
  ["escalat", "escalation"],
  ["privacy", "privacy"],
  ["payment", "payments"],
  ["hr ", "hr"],
  ["audit", "audit"],
];

export function extractMetadata(text: string): SopMetadata {
  const meta: SopMetadata = { tags: [] };
  const lines = text.split(/\r?\n/);
  const header = lines.slice(0, 25);

  for (const line of header) {
    for (const [field, pattern] of FIELD_PATTERNS) {
      const match = pattern.exec(line);
      if (match && !meta[field]) {
        meta[field] = match[1].trim();
      }
    }
  }

  if (!meta.title) {
    const firstNonEmpty = lines.find((l) => l.trim());
    if (firstNonEmpty) meta.title = firstNonEmpty.trim().slice(0, 120);
  }

  const lowered = text.toLowerCase();
  meta.tags = [
    ...new Set(
      TAG_KEYWORDS.filter(([needle]) => lowered.includes(needle)).map(
        ([, tag]) => tag
      )
    ),
  ].sort();

  return meta;
}
