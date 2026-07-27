/**
 * Typed client for the RuleForge AI FastAPI backend.
 *
 * The base URL is read from `NEXT_PUBLIC_API_URL` (see `.env.example`).
 * When the backend is not running, callers should handle thrown errors and
 * fall back to local sample data — the UI is designed to render either way.
 */

import type {
  Project,
  SopFile,
  PipelineResult,
  RuleSet,
  ValidationReport,
} from "@/lib/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }

  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string; version: string }>("/api/health"),

  listProjects: () => request<Project[]>("/api/projects"),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  createProject: (body: { name: string; description: string }) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listFiles: (projectId: string) =>
    request<SopFile[]>(`/api/projects/${projectId}/files`),

  uploadFile: async (projectId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/files`,
      { method: "POST", body: form }
    );
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return (await res.json()) as SopFile;
  },

  runPipeline: (fileId: string) =>
    request<PipelineResult>(`/api/files/${fileId}/pipeline`, {
      method: "POST",
    }),

  generateRules: (projectId: string) =>
    request<RuleSet>(`/api/projects/${projectId}/rules`, { method: "POST" }),

  validateRules: (ruleSetId: string) =>
    request<ValidationReport>(`/api/rules/${ruleSetId}/validate`, {
      method: "POST",
    }),

  exportRulesUrl: (ruleSetId: string) =>
    `${API_BASE_URL}/api/rules/${ruleSetId}/export`,
};
