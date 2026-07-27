/**
 * SOP section detection (Sprint 4) — ported from `services/sections.py`.
 *
 * Splits raw SOP text into titled sections using heading heuristics:
 *   - Markdown headings (`#`, `##`, ...)
 *   - Numbered headings (`1.`, `2.3`, ...)
 *   - Short ALL-CAPS or keyword lines that read as headings
 */

import type { SopSection } from "@/lib/types";
import { newId } from "@/server/id";

const MD_HEADING = /^(#{1,6})\s+(.*)$/;
const NUMBERED = /^\s*(\d+(?:\.\d+)*)[.)]?\s+(.{2,80})$/;
const KEYWORD =
  /^\s*(section|step|procedure|policy|scope|purpose|responsibilit(?:y|ies))\b/i;

interface HeadingMatch {
  isHeading: boolean;
  level: number;
  title: string;
}

function looksLikeHeading(line: string): HeadingMatch {
  const stripped = line.trim();
  if (!stripped) return { isHeading: false, level: 0, title: "" };

  const md = MD_HEADING.exec(stripped);
  if (md) return { isHeading: true, level: md[1].length, title: md[2].trim() };

  const num = NUMBERED.exec(stripped);
  if (num) {
    const level = (num[1].match(/\./g)?.length ?? 0) + 1;
    return { isHeading: true, level: Math.min(level, 6), title: stripped };
  }

  if (KEYWORD.test(stripped) && stripped.length <= 80) {
    return { isHeading: true, level: 2, title: stripped };
  }

  const letters = [...stripped].filter((c) => /[a-zA-Z]/.test(c));
  if (
    letters.length > 0 &&
    stripped.length <= 60 &&
    !stripped.endsWith(".") &&
    letters.filter((c) => c === c.toUpperCase()).length / letters.length > 0.7
  ) {
    return { isHeading: true, level: 1, title: stripped };
  }

  return { isHeading: false, level: 0, title: "" };
}

export function detectSections(text: string): SopSection[] {
  const sections: SopSection[] = [];
  let currentTitle = "Document";
  let currentLevel = 1;
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body || sections.length === 0) {
      sections.push({
        id: newId("sec"),
        title: currentTitle,
        level: currentLevel,
        text: body,
      });
    }
  };

  for (const line of text.split(/\r?\n/)) {
    const { isHeading, level, title } = looksLikeHeading(line);
    if (isHeading) {
      if (buffer.length > 0 || sections.length > 0) flush();
      buffer = [];
      currentTitle = title;
      currentLevel = level;
    } else {
      buffer.push(line);
    }
  }
  flush();

  // Drop a leading empty "Document" placeholder if real sections followed.
  if (sections.length > 1 && !sections[0].text) {
    return sections.slice(1);
  }
  return sections;
}
