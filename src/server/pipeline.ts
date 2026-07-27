/**
 * AI pipeline orchestrator (Sprints 4–6) — ported from `services/pipeline.py`.
 *
 *   text
 *     → metadata extraction        (Sprint 6)
 *     → section detection          (Sprint 4)
 *     → scenario extraction        (Sprint 5)
 *     → resolution grouping        (Sprint 5)
 *     → LLM refinement (optional)  (Sprint 4+)
 *     → knowledge base             (Sprint 6)
 */

import type { PipelineResult } from "@/lib/types";
import { extractMetadata } from "@/server/metadata";
import { detectSections } from "@/server/sections";
import { extractScenarios } from "@/server/scenarios";
import { buildKnowledgeBase } from "@/server/knowledge-base";
import { enhanceScenarios } from "@/server/llm";

export async function runPipeline(
  fileId: string,
  text: string
): Promise<PipelineResult> {
  const metadata = extractMetadata(text);
  const sections = detectSections(text);
  const scenarios = await enhanceScenarios(extractScenarios(sections));
  const knowledgeBase = buildKnowledgeBase(text);

  return {
    file_id: fileId,
    metadata,
    sections,
    scenarios,
    knowledge_base: knowledgeBase,
  };
}
