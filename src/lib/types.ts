/**
 * Shared domain types for RuleForge AI.
 * Mirrors the FastAPI Pydantic schemas in `backend/app/models/schemas.py`.
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
