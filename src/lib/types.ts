/**
 * Shared domain types for RuleForge AI.
 * Mirror the Prisma models in `prisma/schema.prisma`.
 */

export type ProjectStatus = "draft" | "processing" | "ready" | "error";

export type FileStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "processing"
  | "processed"
  | "error";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  file_count: number;
  rule_count: number;
  created_at: string;
  updated_at: string;
}

export interface SopFile {
  id: string;
  project_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: FileStatus;
  page_count?: number;
  char_count?: number;
  created_at: string;
}

export interface SopSection {
  id: string;
  title: string;
  level: number;
  text: string;
}

export interface Scenario {
  id: string;
  section_id: string;
  condition: string;
  resolution: string;
  resolution_group: string;
  confidence: number;
}

export interface SopMetadata {
  title?: string;
  department?: string;
  version?: string;
  effective_date?: string;
  owner?: string;
  tags: string[];
}

export interface KnowledgeEntry {
  term: string;
  definition: string;
  occurrences: number;
}

export type RuleOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "in";

export interface RuleCondition {
  fact: string;
  operator: RuleOperator;
  value: string | number | boolean;
}

export interface RuleAction {
  type: string;
  target: string;
  value?: string | number | boolean;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  priority: number;
  all: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  source_scenario_id?: string;
}

// --- Structured extraction (decision-tree, categorized) --------------------

export type RuleCategory =
  | "business_rule"
  | "agent_obligation"
  | "backend_action"
  | "metadata_condition";

export type ActionKind = "agent_action" | "backend_action" | "business_rule";
export type Obligation = "mandatory" | "conditional";
export type BranchKind = "main" | "exception" | "alternate";

/**
 * A condition, preserved with its exact SOP wording. Leaves carry a parsed
 * fact/operator/value for the Rule Engine; groups preserve nested AND/OR/IF.
 */
export type ConditionNode =
  | {
      type: "leaf";
      raw: string; // exact text from the SOP
      fact: string;
      operator: RuleOperator;
      value: string | number | boolean;
    }
  | { type: "group"; op: "all" | "any"; children: ConditionNode[] };

/** Where a (reusable) rule applies: the triggering scenario + preconditions. */
export interface RuleBinding {
  scenario: string;
  preconditions: string[];
}

/**
 * A single extracted, Rule Engine–ready rule. Reusable: identical logic that
 * recurs across scenarios is stored once and bound to each scenario via
 * `applies_to`, rather than duplicated.
 */
export interface StructuredRule {
  id: string;
  reusable_key: string;
  name: string;
  category: RuleCategory;
  action_kind: ActionKind;
  obligation: Obligation;
  branch: BranchKind;
  order: number;
  preconditions: string[];
  conditions: ConditionNode | null; // nested, exact
  action: RuleAction;
  validation_prompt: string | null; // only for transcript-verifiable agent actions
  applies_to: RuleBinding[]; // triggering scenarios (reuse)
  raw: string; // exact SOP statement
}

export interface MetadataCondition {
  field: string;
  operator: RuleOperator;
  value: string | number | boolean;
  raw: string;
}

export interface ExtractionResult {
  rules: StructuredRule[];
  metadata_conditions: MetadataCondition[];
  scenarios_total: number;
  scenarios_converted: number;
  complete: boolean; // every scenario produced at least one rule
}

export interface RuleSet {
  id: string;
  project_id: string;
  name: string;
  version: string;
  rules: Rule[];
  created_at: string;
}

export interface ValidationIssue {
  rule_id?: string;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  checked_rules: number;
}

export interface PipelineResult {
  file_id: string;
  metadata: SopMetadata;
  sections: SopSection[];
  scenarios: Scenario[];
  knowledge_base: KnowledgeEntry[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "invited";
}

// --- Persistent-view response shapes (Prisma-backed API) -------------------

export interface ProcessOutcome {
  fileId: string;
  projectId: string;
  scenarioCount: number;
  ruleCount: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardStats {
  total_projects: number;
  total_sops: number;
  total_scenarios: number;
  total_rules: number;
  total_kb_entries: number;
  pipeline_success_rate: number; // 0..100
  last_processing_time: string | null; // ISO
  recently_processed: RecentSop[];
}

export interface RecentSop {
  id: string;
  filename: string;
  project_id: string;
  project_name: string;
  status: FileStatus;
  scenario_count: number;
  processed_at: string;
}

export type ActivityType =
  | "sop_uploaded"
  | "metadata_extracted"
  | "sections_detected"
  | "scenarios_extracted"
  | "knowledge_base_built"
  | "rules_generated"
  | "validation_completed"
  | "json_exported"
  | "sop_reprocessed"
  | "sop_renamed"
  | "sop_duplicated"
  | "sop_deleted";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  project_id: string | null;
  file_id: string | null;
  created_at: string;
}

export interface LibraryRow {
  id: string;
  filename: string;
  project_id: string;
  project_name: string;
  department: string | null;
  upload_date: string;
  last_modified: string;
  version: number;
  status: FileStatus;
  scenario_count: number;
  rule_count: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  department: string | null;
  status: ProjectStatus;
  file_count: number;
  scenario_count: number;
  rule_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetails extends ProjectSummary {
  files: LibraryRow[];
  metadata: SopMetadata[];
  sections: SopSection[];
  scenarios: Scenario[];
  knowledge_base: KnowledgeEntry[];
  rules: Rule[];
  structured_rules: StructuredRule[];
  metadata_conditions: MetadataCondition[];
  validation: ValidationReport | null;
  version_history: ProcessingRunItem[];
}

export interface ProcessingRunItem {
  id: string;
  file_id: string;
  filename: string;
  success: boolean;
  duration_ms: number;
  scenarios: number;
  rules: number;
  version: number;
  created_at: string;
}
