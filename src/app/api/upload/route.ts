import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import {
  processUpload,
  hashBytes,
  findDuplicateByHash,
} from "@/server/ingest";
import { UnsupportedFileError } from "@/server/parsing";

export const runtime = "nodejs";

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "") || filename;
}

/**
 * POST /api/upload — upload one or more SOPs.
 *
 * Deduplicates by content hash: a document whose exact content was already
 * ingested is NOT processed again (so the same SOP is never stored twice and
 * dashboard totals never double). A project is created for the batch only when
 * there is at least one genuinely new document. Returns the project id to open.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ detail: "multipart form required" }, { status: 422 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { detail: "at least one 'file' is required" },
      { status: 422 }
    );
  }
  const providedName =
    typeof form.get("name") === "string"
      ? (form.get("name") as string).trim()
      : "";

  let targetProjectId: string | null = null;
  let dupProjectId: string | null = null;
  let created = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const hash = hashBytes(bytes);

    const existing = await findDuplicateByHash(hash);
    if (existing) {
      duplicates += 1;
      dupProjectId ??= existing.projectId;
      continue;
    }

    // Create the batch project lazily on the first new document.
    if (!targetProjectId) {
      const project = await prisma.project.create({
        data: { name: providedName || baseName(file.name || "SOP Upload") },
      });
      targetProjectId = project.id;
    }

    try {
      await processUpload({
        projectId: targetProjectId,
        filename: file.name || "untitled",
        contentType: file.type || "application/octet-stream",
        bytes,
      });
      created += 1;
    } catch (err) {
      if (err instanceof UnsupportedFileError) {
        errors.push(`${file.name}: ${err.message}`);
      } else {
        errors.push(`${file.name}: failed to process`);
      }
    }
  }

  // If a project was created but every document failed to parse, remove the
  // now-empty project so we don't leave an empty shell behind.
  if (created === 0 && targetProjectId) {
    await prisma.project.delete({ where: { id: targetProjectId } }).catch(() => {});
    targetProjectId = null;
  }

  const projectId = created > 0 ? targetProjectId : dupProjectId;

  // Nothing new and nothing to reuse → surface the parse errors.
  if (!projectId) {
    return NextResponse.json(
      {
        detail:
          errors.join("; ") ||
          "No documents could be processed. Supported: PDF, Word, Excel, CSV, TXT.",
      },
      { status: 415 }
    );
  }

  return NextResponse.json(
    { projectId, created, duplicates, errors },
    { status: 201 }
  );
}
