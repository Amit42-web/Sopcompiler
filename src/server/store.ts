/**
 * In-memory data store (ported from the FastAPI `services/storage.py`).
 *
 * Held on `globalThis` so it survives Next.js hot-module reloads in dev and is
 * shared across route handlers in a single server process. The shape is
 * database-shaped; swapping in a real database (a later sprint) means replacing
 * the method bodies, not the call sites.
 */

import type {
  PipelineResult,
  Project,
  ProjectStatus,
  RuleSet,
  SopFile,
  TeamMember,
} from "@/lib/types";
import { newId, nowIso } from "@/server/id";

interface StoreData {
  projects: Map<string, Project>;
  files: Map<string, SopFile>;
  fileText: Map<string, string>;
  pipelineResults: Map<string, PipelineResult>;
  ruleSets: Map<string, RuleSet>;
  members: Map<string, TeamMember>;
}

function createStore(): StoreData {
  const data: StoreData = {
    projects: new Map(),
    files: new Map(),
    fileText: new Map(),
    pipelineResults: new Map(),
    ruleSets: new Map(),
    members: new Map(),
  };

  // Seed the workspace owner.
  const owner: TeamMember = {
    id: newId("usr"),
    name: "Workspace Owner",
    email: "owner@example.com",
    role: "owner",
    status: "active",
  };
  data.members.set(owner.id, owner);

  return data;
}

// Persist across HMR by stashing on globalThis.
const globalForStore = globalThis as unknown as { __ruleforgeStore?: StoreData };
const data: StoreData = globalForStore.__ruleforgeStore ?? createStore();
if (!globalForStore.__ruleforgeStore) globalForStore.__ruleforgeStore = data;

export const store = {
  // --- Projects ------------------------------------------------------------
  createProject(input: { name: string; description?: string }): Project {
    const project: Project = {
      id: newId("prj"),
      name: input.name,
      description: input.description ?? "",
      status: "draft",
      file_count: 0,
      rule_count: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.projects.set(project.id, project);
    return project;
  },

  listProjects(): Project[] {
    return [...data.projects.values()];
  },

  getProject(id: string): Project | undefined {
    return data.projects.get(id);
  },

  setProjectStatus(id: string, status: ProjectStatus): void {
    const project = data.projects.get(id);
    if (project) {
      project.status = status;
      project.updated_at = nowIso();
    }
  },

  touchProject(id: string): void {
    const project = data.projects.get(id);
    if (project) {
      project.updated_at = nowIso();
      project.file_count = this.listFiles(id).length;
    }
  },

  // --- Files ---------------------------------------------------------------
  addFile(file: SopFile, text: string): SopFile {
    data.files.set(file.id, file);
    data.fileText.set(file.id, text);
    this.touchProject(file.project_id);
    return file;
  },

  listFiles(projectId: string): SopFile[] {
    return [...data.files.values()].filter((f) => f.project_id === projectId);
  },

  getFile(id: string): SopFile | undefined {
    return data.files.get(id);
  },

  getFileText(id: string): string | undefined {
    return data.fileText.get(id);
  },

  // --- Pipeline results ----------------------------------------------------
  savePipelineResult(result: PipelineResult): void {
    data.pipelineResults.set(result.file_id, result);
  },

  getPipelineResult(fileId: string): PipelineResult | undefined {
    return data.pipelineResults.get(fileId);
  },

  listPipelineResults(projectId: string): PipelineResult[] {
    const fileIds = new Set(this.listFiles(projectId).map((f) => f.id));
    return [...data.pipelineResults.entries()]
      .filter(([fid]) => fileIds.has(fid))
      .map(([, result]) => result);
  },

  // --- Rule sets -----------------------------------------------------------
  saveRuleSet(ruleSet: RuleSet): RuleSet {
    data.ruleSets.set(ruleSet.id, ruleSet);
    const project = data.projects.get(ruleSet.project_id);
    if (project) {
      project.rule_count = ruleSet.rules.length;
      project.updated_at = nowIso();
    }
    return ruleSet;
  },

  getRuleSet(id: string): RuleSet | undefined {
    return data.ruleSets.get(id);
  },

  // --- Dashboard aggregates ------------------------------------------------
  getStats(): {
    sopsUploaded: number;
    scenariosExtracted: number;
    rulesGenerated: number;
    completedRuns: number;
  } {
    let scenariosExtracted = 0;
    for (const result of data.pipelineResults.values()) {
      scenariosExtracted += result.scenarios.length;
    }
    let rulesGenerated = 0;
    for (const ruleSet of data.ruleSets.values()) {
      rulesGenerated += ruleSet.rules.length;
    }
    return {
      sopsUploaded: data.files.size,
      scenariosExtracted,
      rulesGenerated,
      completedRuns: data.pipelineResults.size,
    };
  },

  getRecentActivity(
    limit = 6
  ): { id: string; title: string; detail: string; time: string }[] {
    return [...data.files.values()]
      .map((file) => {
        const result = data.pipelineResults.get(file.id);
        const detail = result
          ? `${result.scenarios.length} scenario${
              result.scenarios.length === 1 ? "" : "s"
            } extracted`
          : file.status === "error"
          ? "Upload failed"
          : "Uploaded";
        return { id: file.id, title: file.filename, detail, time: file.created_at };
      })
      .sort((a, b) => (a.time < b.time ? 1 : -1))
      .slice(0, limit);
  },

  // --- Members -------------------------------------------------------------
  listMembers(): TeamMember[] {
    return [...data.members.values()];
  },

  addMember(member: TeamMember): TeamMember {
    data.members.set(member.id, member);
    return member;
  },
};
