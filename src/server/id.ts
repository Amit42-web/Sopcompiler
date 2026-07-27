import { randomUUID } from "node:crypto";

/** Generate a short, prefixed id (e.g. `prj_1a2b3c4d5e6f`). */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** ISO-8601 timestamp for "now" in UTC. */
export function nowIso(): string {
  return new Date().toISOString();
}
