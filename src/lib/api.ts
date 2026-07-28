/**
 * Typed client for the RuleForge AI API.
 *
 * The API runs inside this Next.js app as Route Handlers under `src/app/api/*`
 * backed by PostgreSQL, so the default base URL is same-origin.
 */

import type {
  ActivityItem,
  DashboardStats,
  LibraryRow,
  Paginated,
  ProcessOutcome,
  Project,
  ProjectDetails,
  ProjectSummary,
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
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

export const api = {
  // --- Dashboard / activity / library -------------------------------------
  dashboard: () => request<DashboardStats>("/api/dashboard"),
  activity: (limit = 20) =>
    request<ActivityItem[]>(`/api/activity${qs({ limit })}`),
  library: (opts: { page?: number; pageSize?: number; search?: string } = {}) =>
    request<Paginated<LibraryRow>>(
      `/api/library${qs({ page: opts.page, pageSize: opts.pageSize, search: opts.search })}`
    ),

  // --- Projects ------------------------------------------------------------
  listProjects: (opts: { page?: number; pageSize?: number } = {}) =>
    request<Paginated<ProjectSummary>>(
      `/api/projects${qs({ page: opts.page, pageSize: opts.pageSize })}`
    ),
  createProject: (body: { name: string; description?: string }) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProject: (id: string) =>
    request<ProjectDetails>(`/api/projects/${id}`),
  renameProject: (id: string, body: { name?: string; description?: string }) =>
    request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteProject: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),

  // --- Files (SOPs) --------------------------------------------------------
  uploadFile: async (projectId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/files`,
      { method: "POST", body: form }
    );
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return (await res.json()) as ProcessOutcome;
  },
  reprocessFile: (id: string) =>
    request<ProcessOutcome>(`/api/files/${id}/reprocess`, { method: "POST" }),
  renameFile: (id: string, filename: string) =>
    request<unknown>(`/api/files/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ filename }),
    }),
  duplicateFile: (id: string) =>
    request<unknown>(`/api/files/${id}/duplicate`, { method: "POST" }),
  deleteFile: (id: string) =>
    request<void>(`/api/files/${id}`, { method: "DELETE" }),
  exportFileUrl: (id: string) => `${API_BASE_URL}/api/files/${id}/export`,

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
  removeMember: (id: string) =>
    request<void>(`/api/team/${id}`, { method: "DELETE" }),
};
