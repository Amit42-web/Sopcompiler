/**
 * Ingestion & persistence orchestration.
 *
 * Runs the pure pipeline (parsing → metadata → sections → scenarios →
 * knowledge base → rules → validation) and persists every intermediate result
 * to PostgreSQL via Prisma, then records a ProcessingRun and activity feed
 * entries. This is the single place that writes pipeline output to the database.
 */

import { createHash } from "node:crypto";

import { prisma } from "@/server/db";
import { parseDocument } from "@/server/parsing";
import { runPipeline } from "@/server/pipeline";
import { extractRules } from "@/server/extraction";
import { extractStructured, buildRuleEngineTree } from "@/server/llm";
import { buildKnowledgeGraph } from "@/server/knowledge-graph";
import { compileGraphToTree } from "@/server/rule-engine";
import type {
  ActivityType,
  ConditionNode,
  PipelineResult,
  RuleCondition,
} from "@/lib/types";

async function logActivity(
  type: ActivityType,
  message: string,
  projectId?: string,
  fileId?: string
) {
  await prisma.activity.create({
    data: { type, message, projectId, fileId },
  });
}

/** Content hash of a document's bytes — used to detect duplicate uploads. */
export function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

/** The most recent stored SOP with identical content, if any. */
export async function findDuplicateByHash(hash: string) {
  return prisma.sopFile.findFirst({
    where: { contentHash: hash },
    orderBy: { createdAt: "desc" },
  });
}

/** Persist the pipeline output for a file (metadata, sections, scenarios, KB). */
async function persistPipeline(fileId: string, result: PipelineResult) {
  // Metadata (one-to-one).
  await prisma.metadata.upsert({
    where: { fileId },
    create: {
      fileId,
      title: result.metadata.title,
      department: result.metadata.department,
      version: result.metadata.version,
      effectiveDate: result.metadata.effective_date,
      owner: result.metadata.owner,
      tags: JSON.stringify(result.metadata.tags),
    },
    update: {
      title: result.metadata.title,
      department: result.metadata.department,
      version: result.metadata.version,
      effectiveDate: result.metadata.effective_date,
      owner: result.metadata.owner,
      tags: JSON.stringify(result.metadata.tags),
    },
  });

  // Sections — keep a map from pipeline id → db id so scenarios can reference.
  const sectionIdMap = new Map<string, string>();
  for (let i = 0; i < result.sections.length; i++) {
    const s = result.sections[i];
    const created = await prisma.section.create({
      data: { fileId, title: s.title, level: s.level, text: s.text, order: i },
    });
    sectionIdMap.set(s.id, created.id);
  }

  if (result.scenarios.length > 0) {
    await prisma.scenario.createMany({
      data: result.scenarios.map((sc) => ({
        fileId,
        sectionRef: sectionIdMap.get(sc.section_id) ?? null,
        condition: sc.condition,
        resolution: sc.resolution,
        resolutionGroup: sc.resolution_group,
        confidence: sc.confidence,
      })),
    });
  }

  if (result.knowledge_base.length > 0) {
    await prisma.knowledgeEntry.createMany({
      data: result.knowledge_base.map((k) => ({
        fileId,
        term: k.term,
        definition: k.definition,
        occurrences: k.occurrences,
      })),
    });
  }
}

/** Flatten a nested condition tree to leaf conditions for the flat engine. */
function flattenConditions(node: ConditionNode | null): RuleCondition[] {
  if (!node) return [];
  if (node.type === "leaf")
    return [{ fact: node.fact, operator: node.operator, value: node.value }];
  return node.children.flatMap(flattenConditions);
}

/**
 * Regenerate the project's rules from every processed file using the
 * structured decision-tree extractor, replacing any previous rule set. Rules
 * are de-duplicated into reusable definitions bound to each scenario. Also
 * persists metadata condition nodes and a completeness validation report.
 */
export async function regenerateProjectRules(projectId: string): Promise<{
  ruleSetId: string | null;
  ruleCount: number;
  valid: boolean;
}> {
  const sectionRows = await prisma.section.findMany({
    where: { file: { projectId } },
    orderBy: [{ fileId: "asc" }, { order: "asc" }],
  });

  if (sectionRows.length === 0) {
    await prisma.ruleSet.deleteMany({ where: { projectId } });
    return { ruleSetId: null, ruleCount: 0, valid: true };
  }

  const sections = sectionRows.map((s) => ({
    id: s.id,
    title: s.title,
    level: s.level,
    text: s.text,
  }));

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });
  const projectName = project?.name ?? "Rule Engine";

  const extraction = extractRules(sections);

  // Full-fidelity LLM extraction when configured; heuristic is the fallback.
  const llmRules = await extractStructured(sections);
  if (llmRules && llmRules.length > 0) {
    extraction.rules = llmRules;
    extraction.scenarios_converted = extraction.scenarios_total;
    extraction.complete = true;
  }

  // SOP → Knowledge Graph → Rule Engine. The graph identifies scenarios,
  // metadata, decisions, communication, system actions, AI evaluations and
  // responses; the compiler applies the architectural rules to produce the
  // decision tree. The LLM builds the tree directly from the SOP when
  // configured; the graph compiler is the fallback.
  const knowledgeGraph = buildKnowledgeGraph(sections, extraction.rules);
  const engineTree =
    (await buildRuleEngineTree(projectName, sections)) ??
    compileGraphToTree(projectName, knowledgeGraph);

  // Completeness / structural validation.
  const issues = [] as { severity: string; code: string; message: string }[];
  if (!extraction.complete) {
    issues.push({
      severity: "warning",
      code: "INCOMPLETE_EXTRACTION",
      message: `${extraction.scenarios_total - extraction.scenarios_converted} of ${extraction.scenarios_total} scenarios produced no rules.`,
    });
  }
  for (const r of extraction.rules) {
    if (r.action_kind === "agent_action" && !r.validation_prompt) {
      issues.push({
        severity: "warning",
        code: "MISSING_VALIDATION_PROMPT",
        message: `Agent obligation "${r.name}" has no validation prompt.`,
      });
    }
  }
  const valid = extraction.complete && !issues.some((i) => i.severity === "error");

  await prisma.ruleSet.deleteMany({ where: { projectId } });
  const created = await prisma.ruleSet.create({
    data: {
      projectId,
      name: "Extracted rule set",
      version: "1.0.0",
      metadataConditions: JSON.stringify(extraction.metadata_conditions),
      knowledgeGraph: JSON.stringify(knowledgeGraph),
      engineTree: JSON.stringify(engineTree),
      rules: {
        create: extraction.rules.map((r) => ({
          name: r.name,
          description: r.raw,
          priority: Math.round(r.order),
          enabled: true,
          conditions: JSON.stringify(flattenConditions(r.conditions)),
          actions: JSON.stringify([r.action]),
          category: r.category,
          actionKind: r.action_kind,
          obligation: r.obligation,
          branch: r.branch,
          orderIndex: Math.round(r.order),
          validationPrompt: r.validation_prompt,
          preconditions: JSON.stringify(r.preconditions),
          conditionsTree: JSON.stringify(r.conditions),
          appliesTo: JSON.stringify(r.applies_to),
          reusableKey: r.reusable_key,
          rawText: r.raw,
        })),
      },
      validationReports: {
        create: {
          valid,
          checkedRules: extraction.rules.length,
          issues: JSON.stringify(issues),
        },
      },
    },
  });

  return {
    ruleSetId: created.id,
    ruleCount: extraction.rules.length,
    valid,
  };
}

export interface ProcessOutcome {
  fileId: string;
  projectId: string;
  scenarioCount: number;
  ruleCount: number;
}

/**
 * Upload + fully process a single document into a project. Persists the raw
 * text and every pipeline artifact, generates & validates rules, records a
 * ProcessingRun, and writes activity entries.
 */
export async function processUpload(params: {
  projectId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<ProcessOutcome> {
  const { projectId, filename, contentType, bytes } = params;
  const started = Date.now();

  const parsed = await parseDocument(filename, contentType, bytes);

  const file = await prisma.sopFile.create({
    data: {
      projectId,
      filename,
      contentType,
      sizeBytes: bytes.byteLength,
      status: "processing",
      pageCount: parsed.pageCount ?? undefined,
      charCount: parsed.charCount,
      contentHash: hashBytes(bytes),
      rawText: parsed.text,
    },
  });
  await logActivity("sop_uploaded", `Uploaded “${filename}”`, projectId, file.id);
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "processing" },
  });

  const result = await runPipeline(file.id, parsed.text);
  await persistPipeline(file.id, result);

  await logActivity(
    "metadata_extracted",
    `Metadata extracted from “${filename}”`,
    projectId,
    file.id
  );
  await logActivity(
    "sections_detected",
    `${result.sections.length} sections detected in “${filename}”`,
    projectId,
    file.id
  );
  await logActivity(
    "scenarios_extracted",
    `${result.scenarios.length} scenarios extracted from “${filename}”`,
    projectId,
    file.id
  );
  await logActivity(
    "knowledge_base_built",
    `${result.knowledge_base.length} knowledge-base entries built`,
    projectId,
    file.id
  );

  const rules = await regenerateProjectRules(projectId);
  await logActivity(
    "rules_generated",
    `${rules.ruleCount} rules generated`,
    projectId,
    file.id
  );
  await logActivity(
    "validation_completed",
    `Validation ${rules.valid ? "passed" : "found issues"}`,
    projectId,
    file.id
  );

  await prisma.sopFile.update({
    where: { id: file.id },
    data: { status: "processed" },
  });
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "ready",
      department: result.metadata.department ?? undefined,
    },
    include: { files: true },
  });

  await prisma.processingRun.create({
    data: {
      projectId,
      fileId: file.id,
      success: true,
      durationMs: Date.now() - started,
      scenarios: result.scenarios.length,
      rules: rules.ruleCount,
      version: file.version,
    },
  });

  return {
    fileId: file.id,
    projectId: project.id,
    scenarioCount: result.scenarios.length,
    ruleCount: rules.ruleCount,
  };
}

/** Re-run the pipeline for an existing file, bumping its version. */
export async function reprocessFile(fileId: string): Promise<ProcessOutcome> {
  const file = await prisma.sopFile.findUnique({ where: { id: fileId } });
  if (!file) throw new Error("File not found");
  const started = Date.now();

  // Clear previous artifacts for this file.
  await prisma.$transaction([
    prisma.section.deleteMany({ where: { fileId } }),
    prisma.scenario.deleteMany({ where: { fileId } }),
    prisma.knowledgeEntry.deleteMany({ where: { fileId } }),
  ]);

  await prisma.sopFile.update({
    where: { id: fileId },
    data: { status: "processing", version: { increment: 1 } },
  });

  const result = await runPipeline(fileId, file.rawText);
  await persistPipeline(fileId, result);
  const rules = await regenerateProjectRules(file.projectId);

  const updated = await prisma.sopFile.update({
    where: { id: fileId },
    data: { status: "processed" },
  });

  await prisma.processingRun.create({
    data: {
      projectId: file.projectId,
      fileId,
      success: true,
      durationMs: Date.now() - started,
      scenarios: result.scenarios.length,
      rules: rules.ruleCount,
      version: updated.version,
    },
  });
  await logActivity(
    "sop_reprocessed",
    `Reprocessed “${file.filename}” (v${updated.version})`,
    file.projectId,
    fileId
  );

  return {
    fileId,
    projectId: file.projectId,
    scenarioCount: result.scenarios.length,
    ruleCount: rules.ruleCount,
  };
}

export { logActivity };
