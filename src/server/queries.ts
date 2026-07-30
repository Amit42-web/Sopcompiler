/**
 * Read-side queries (Prisma → API response shapes).
 *
 * All list queries are paginated. Per-file scenario/rule counts are computed
 * with a constant number of queries per page (no N+1) so the library and
 * project views scale to thousands of SOPs.
 */

import { prisma } from "@/server/db";
import type {
  ActivityItem,
  ActivityType,
  ConditionNode,
  DashboardStats,
  FileStatus,
  LibraryRow,
  MetadataCondition,
  Paginated,
  ProjectDetails,
  ProjectStatus,
  ProjectSummary,
  Rule,
  RuleBinding,
  RuleCondition,
  RuleAction,
  RuleEngineTree,
  StructuredRule,
  ValidationReport,
  ValidationIssue,
} from "@/lib/types";

function clampPage(page?: number): number {
  return Math.max(1, Math.floor(page ?? 1));
}
function clampSize(size?: number): number {
  return Math.min(100, Math.max(1, Math.floor(size ?? 20)));
}

/**
 * Given a set of file ids, return per-file scenario and rule counts using a
 * fixed number of queries (avoids N+1 across a page of rows).
 */
async function countsByFile(fileIds: string[]): Promise<{
  scenarios: Map<string, number>;
  rules: Map<string, number>;
}> {
  const scenarios = new Map<string, number>();
  const rules = new Map<string, number>();
  if (fileIds.length === 0) return { scenarios, rules };

  const scenarioRows = await prisma.scenario.findMany({
    where: { fileId: { in: fileIds } },
    select: { id: true, fileId: true },
  });
  const scenarioToFile = new Map<string, string>();
  for (const s of scenarioRows) {
    scenarioToFile.set(s.id, s.fileId);
    scenarios.set(s.fileId, (scenarios.get(s.fileId) ?? 0) + 1);
  }

  const ruleRows = await prisma.rule.findMany({
    where: { sourceScenario: { in: [...scenarioToFile.keys()] } },
    select: { sourceScenario: true },
  });
  for (const r of ruleRows) {
    const fileId = r.sourceScenario && scenarioToFile.get(r.sourceScenario);
    if (fileId) rules.set(fileId, (rules.get(fileId) ?? 0) + 1);
  }

  return { scenarios, rules };
}

// --- Dashboard -------------------------------------------------------------

export async function dashboardStats(): Promise<DashboardStats> {
  const [
    totalProjects,
    totalSops,
    totalScenarios,
    totalRules,
    totalKb,
    runAgg,
    lastRun,
    recentFiles,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.sopFile.count(),
    prisma.scenario.count(),
    prisma.rule.count(),
    prisma.knowledgeEntry.count(),
    prisma.processingRun.groupBy({ by: ["success"], _count: { _all: true } }),
    prisma.processingRun.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.sopFile.findMany({
      where: { status: "processed" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { project: { select: { name: true } }, _count: { select: { scenarios: true } } },
    }),
  ]);

  const totalRuns = runAgg.reduce((n, r) => n + r._count._all, 0);
  const successRuns =
    runAgg.find((r) => r.success)?._count._all ?? 0;

  return {
    total_projects: totalProjects,
    total_sops: totalSops,
    total_scenarios: totalScenarios,
    total_rules: totalRules,
    total_kb_entries: totalKb,
    pipeline_success_rate:
      totalRuns === 0 ? 100 : Math.round((successRuns / totalRuns) * 100),
    last_processing_time: lastRun?.createdAt.toISOString() ?? null,
    recently_processed: recentFiles.map((f) => ({
      id: f.id,
      filename: f.filename,
      project_id: f.projectId,
      project_name: f.project.name,
      status: f.status as FileStatus,
      scenario_count: f._count.scenarios,
      processed_at: f.updatedAt.toISOString(),
    })),
  };
}

// --- Activity feed ---------------------------------------------------------

export async function recentActivity(limit = 20): Promise<ActivityItem[]> {
  const rows = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(100, Math.max(1, limit)),
  });
  return rows.map((a) => ({
    id: a.id,
    type: a.type as ActivityType,
    message: a.message,
    project_id: a.projectId,
    file_id: a.fileId,
    created_at: a.createdAt.toISOString(),
  }));
}

// --- SOP library -----------------------------------------------------------

export async function listLibrary(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<Paginated<LibraryRow>> {
  const page = clampPage(opts.page);
  const pageSize = clampSize(opts.pageSize);
  const where = opts.search
    ? { filename: { contains: opts.search } }
    : {};

  const [total, files] = await Promise.all([
    prisma.sopFile.count({ where }),
    prisma.sopFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        project: { select: { name: true } },
        metadata: { select: { department: true } },
      },
    }),
  ]);

  const counts = await countsByFile(files.map((f) => f.id));

  return {
    items: files.map((f) => ({
      id: f.id,
      filename: f.filename,
      project_id: f.projectId,
      project_name: f.project.name,
      department: f.metadata?.department ?? null,
      upload_date: f.createdAt.toISOString(),
      last_modified: f.updatedAt.toISOString(),
      version: f.version,
      status: f.status as FileStatus,
      scenario_count: counts.scenarios.get(f.id) ?? 0,
      rule_count: counts.rules.get(f.id) ?? 0,
    })),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// --- Projects --------------------------------------------------------------

export async function listProjects(opts: {
  page?: number;
  pageSize?: number;
}): Promise<Paginated<ProjectSummary>> {
  const page = clampPage(opts.page);
  const pageSize = clampSize(opts.pageSize);

  const [total, projects] = await Promise.all([
    prisma.project.count(),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { files: true } },
        files: { select: { _count: { select: { scenarios: true } } } },
        ruleSets: { select: { _count: { select: { rules: true } } } },
      },
    }),
  ]);

  return {
    items: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      department: p.department,
      status: p.status as ProjectStatus,
      file_count: p._count.files,
      scenario_count: p.files.reduce((n, f) => n + f._count.scenarios, 0),
      rule_count: p.ruleSets.reduce((n, r) => n + r._count.rules, 0),
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    })),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRule(r: {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  conditions: string;
  actions: string;
  sourceScenario: string | null;
}): Rule {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    priority: r.priority,
    enabled: r.enabled,
    all: parseJson<RuleCondition[]>(r.conditions, []),
    actions: parseJson<RuleAction[]>(r.actions, []),
    source_scenario_id: r.sourceScenario ?? undefined,
  };
}

function mapStructuredRule(r: {
  id: string;
  name: string;
  category: string;
  actionKind: string;
  obligation: string;
  branch: string;
  orderIndex: number;
  validationPrompt: string | null;
  preconditions: string;
  conditionsTree: string;
  actions: string;
  appliesTo: string;
  reusableKey: string;
  rawText: string;
}): StructuredRule {
  const actions = parseJson<RuleAction[]>(r.actions, []);
  return {
    id: r.id,
    reusable_key: r.reusableKey,
    name: r.name,
    category: r.category as StructuredRule["category"],
    action_kind: r.actionKind as StructuredRule["action_kind"],
    obligation: r.obligation as StructuredRule["obligation"],
    branch: r.branch as StructuredRule["branch"],
    order: r.orderIndex,
    preconditions: parseJson<string[]>(r.preconditions, []),
    conditions: parseJson<ConditionNode | null>(r.conditionsTree, null),
    action: actions[0] ?? { type: "noop", target: "" },
    validation_prompt: r.validationPrompt,
    applies_to: parseJson<RuleBinding[]>(r.appliesTo, []),
    raw: r.rawText,
  };
}

export async function getProjectDetails(
  id: string
): Promise<ProjectDetails | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      files: {
        orderBy: { createdAt: "desc" },
        include: {
          metadata: true,
          sections: { orderBy: { order: "asc" } },
          scenarios: true,
          knowledgeBase: true,
          project: { select: { name: true } },
        },
      },
      ruleSets: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          rules: { orderBy: { priority: "asc" } },
          validationReports: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { file: { select: { filename: true } } },
      },
    },
  });
  if (!project) return null;

  const counts = await countsByFile(project.files.map((f) => f.id));
  const ruleSet = project.ruleSets[0];
  const rules = ruleSet ? ruleSet.rules.map(mapRule) : [];
  const structuredRules = ruleSet
    ? ruleSet.rules.map(mapStructuredRule).sort((a, b) => a.order - b.order)
    : [];
  const metadataConditions = ruleSet
    ? parseJson<MetadataCondition[]>(ruleSet.metadataConditions, [])
    : [];
  const engineTree = ruleSet
    ? parseJson<RuleEngineTree | null>(ruleSet.engineTree, null)
    : null;
  const validationRow = ruleSet?.validationReports[0];
  const validation: ValidationReport | null = validationRow
    ? {
        valid: validationRow.valid,
        checked_rules: validationRow.checkedRules,
        issues: parseJson<ValidationIssue[]>(validationRow.issues, []),
      }
    : null;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    department: project.department,
    status: project.status as ProjectStatus,
    file_count: project.files.length,
    scenario_count: project.files.reduce(
      (n, f) => n + f.scenarios.length,
      0
    ),
    rule_count: rules.length,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    files: project.files.map((f) => ({
      id: f.id,
      filename: f.filename,
      project_id: f.projectId,
      project_name: f.project.name,
      department: f.metadata?.department ?? null,
      upload_date: f.createdAt.toISOString(),
      last_modified: f.updatedAt.toISOString(),
      version: f.version,
      status: f.status as FileStatus,
      scenario_count: counts.scenarios.get(f.id) ?? 0,
      rule_count: counts.rules.get(f.id) ?? 0,
    })),
    metadata: project.files
      .filter((f) => f.metadata)
      .map((f) => ({
        title: f.metadata!.title ?? undefined,
        department: f.metadata!.department ?? undefined,
        version: f.metadata!.version ?? undefined,
        effective_date: f.metadata!.effectiveDate ?? undefined,
        owner: f.metadata!.owner ?? undefined,
        tags: parseJson<string[]>(f.metadata!.tags, []),
      })),
    sections: project.files.flatMap((f) =>
      f.sections.map((s) => ({
        id: s.id,
        title: s.title,
        level: s.level,
        text: s.text,
      }))
    ),
    scenarios: project.files.flatMap((f) =>
      f.scenarios.map((s) => ({
        id: s.id,
        section_id: s.sectionRef ?? "",
        condition: s.condition,
        resolution: s.resolution,
        resolution_group: s.resolutionGroup,
        confidence: s.confidence,
      }))
    ),
    knowledge_base: project.files.flatMap((f) =>
      f.knowledgeBase.map((k) => ({
        term: k.term,
        definition: k.definition,
        occurrences: k.occurrences,
      }))
    ),
    rules,
    structured_rules: structuredRules,
    metadata_conditions: metadataConditions,
    engine_tree: engineTree,
    validation,
    version_history: project.runs.map((r) => ({
      id: r.id,
      file_id: r.fileId,
      filename: r.file.filename,
      success: r.success,
      duration_ms: r.durationMs,
      scenarios: r.scenarios,
      rules: r.rules,
      version: r.version,
      created_at: r.createdAt.toISOString(),
    })),
  };
}

/** The latest rule set for a project, as a RuleSet-ish payload for export. */
export async function getLatestRules(projectId: string): Promise<Rule[]> {
  const ruleSet = await prisma.ruleSet.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { rules: { orderBy: { priority: "asc" } } },
  });
  return ruleSet ? ruleSet.rules.map(mapRule) : [];
}

/** The latest structured rule set + metadata conditions + engine tree. */
export async function getLatestStructured(projectId: string): Promise<{
  rules: StructuredRule[];
  metadata_conditions: MetadataCondition[];
  engine_tree: RuleEngineTree | null;
}> {
  const ruleSet = await prisma.ruleSet.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { rules: { orderBy: { orderIndex: "asc" } } },
  });
  return {
    rules: ruleSet ? ruleSet.rules.map(mapStructuredRule) : [],
    metadata_conditions: ruleSet
      ? parseJson<MetadataCondition[]>(ruleSet.metadataConditions, [])
      : [],
    engine_tree: ruleSet
      ? parseJson<RuleEngineTree | null>(ruleSet.engineTree, null)
      : null,
  };
}
