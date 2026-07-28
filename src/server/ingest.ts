/**
 * Ingestion & persistence orchestration.
 *
 * Runs the pure pipeline (parsing → metadata → sections → scenarios →
 * knowledge base → rules → validation) and persists every intermediate result
 * to PostgreSQL via Prisma, then records a ProcessingRun and activity feed
 * entries. This is the single place that writes pipeline output to the database.
 */

import { prisma } from "@/server/db";
import type { ActivityType, Prisma } from "@/generated/prisma";
import { parseDocument } from "@/server/parsing";
import { runPipeline } from "@/server/pipeline";
import { generateRuleSet } from "@/server/rules-engine";
import { validateRuleSet } from "@/server/validation";
import type { PipelineResult, Rule, RuleSet } from "@/lib/types";

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
      tags: result.metadata.tags,
    },
    update: {
      title: result.metadata.title,
      department: result.metadata.department,
      version: result.metadata.version,
      effectiveDate: result.metadata.effective_date,
      owner: result.metadata.owner,
      tags: result.metadata.tags,
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

/**
 * Regenerate the project's rule set from every processed file, replacing any
 * previous rule set so counts always reflect current state. Also persists a
 * fresh validation report. Returns the number of rules generated.
 */
export async function regenerateProjectRules(projectId: string): Promise<{
  ruleSetId: string | null;
  ruleCount: number;
  valid: boolean;
}> {
  const scenarios = await prisma.scenario.findMany({
    where: { file: { projectId } },
  });
  if (scenarios.length === 0) {
    await prisma.ruleSet.deleteMany({ where: { projectId } });
    return { ruleSetId: null, ruleCount: 0, valid: true };
  }

  // Build a minimal PipelineResult carrying just the scenarios rule generation
  // needs.
  const pseudoResult: PipelineResult = {
    file_id: projectId,
    metadata: { tags: [] },
    sections: [],
    scenarios: scenarios.map((s) => ({
      id: s.id,
      section_id: s.sectionRef ?? "",
      condition: s.condition,
      resolution: s.resolution,
      resolution_group: s.resolutionGroup,
      confidence: s.confidence,
    })),
    knowledge_base: [],
  };

  const ruleSet: RuleSet = generateRuleSet(projectId, [pseudoResult]);
  const report = validateRuleSet(ruleSet);

  // Replace previous rule sets for this project.
  await prisma.ruleSet.deleteMany({ where: { projectId } });
  const created = await prisma.ruleSet.create({
    data: {
      projectId,
      name: ruleSet.name,
      version: ruleSet.version,
      rules: {
        create: ruleSet.rules.map((r: Rule) => ({
          name: r.name,
          description: r.description,
          priority: r.priority,
          enabled: r.enabled,
          conditions: r.all as unknown as Prisma.InputJsonValue,
          actions: r.actions as unknown as Prisma.InputJsonValue,
          sourceScenario: r.source_scenario_id,
        })),
      },
      validationReports: {
        create: {
          valid: report.valid,
          checkedRules: report.checked_rules,
          issues: report.issues as unknown as Prisma.InputJsonValue,
        },
      },
    },
  });

  return {
    ruleSetId: created.id,
    ruleCount: ruleSet.rules.length,
    valid: report.valid,
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
