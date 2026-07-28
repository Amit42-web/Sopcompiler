/**
 * Typed client for the RuleForge AI API.
 *
 * The API now runs inside this Next.js app as Route Handlers under
 * `src/app/api/*`, so the default base URL is same-origin (empty string).
 * `NEXT_PUBLIC_API_URL` can still point the client at a remote deployment.
 * Callers should handle thrown errors and fall back to local sample data —
 * the UI is designed to render either way.
 */

import type {
  SopFile,
  PipelineResult,
  RuleSet,
  ValidationReport,
  TeamMember,
} from "@/lib/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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

  // --- Files (workspace-level) --------------------------------------------
  listFiles: () => request<SopFile[]>("/api/files"),

  uploadFile: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/files`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return (await res.json()) as SopFile;
  },

  runPipeline: (fileId: string) =>
    request<PipelineResult>(`/api/files/${fileId}/pipeline`, {
      method: "POST",
    }),

  getPipelineResult: (fileId: string) =>
    request<PipelineResult>(`/api/files/${fileId}/pipeline`),

  // --- Rules ---------------------------------------------------------------
  generateRules: () =>
    request<RuleSet>("/api/rules/generate", { method: "POST" }),

  validateRules: (ruleSetId: string) =>
    request<ValidationReport>(`/api/rules/${ruleSetId}/validate`, {
      method: "POST",
    }),

  exportRulesUrl: (ruleSetId: string) =>
    `${API_BASE_URL}/api/rules/${ruleSetId}/export`,

  // --- Team ----------------------------------------------------------------
  listTeam: () => request<TeamMember[]>("/api/team"),

  inviteMember: (body: { email: string; name?: string; role: string }) =>
    request<TeamMember>("/api/team/invite", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateMemberRole: (id: string, role: string) =>
    request<TeamMember>(`/api/team/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeMember: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/team/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
  },
};
