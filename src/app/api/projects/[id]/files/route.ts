import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { processUpload } from "@/server/ingest";
import { UnsupportedFileError } from "@/server/parsing";

export const runtime = "nodejs";

/**
 * POST /api/projects/:id/files — upload + fully process an SOP.
 * Persists the raw document and every pipeline artifact, generates & validates
 * rules, and returns the outcome (including the project id for redirect).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: "multipart form field 'file' is required" },
      { status: 422 }
    );
  }

  try {
    const outcome = await processUpload({
      projectId: id,
      filename: file.name || "untitled",
      contentType: file.type || "application/octet-stream",
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return NextResponse.json(outcome, { status: 201 });
  } catch (err) {
    if (err instanceof UnsupportedFileError) {
      return NextResponse.json({ detail: err.message }, { status: 415 });
    }
    return NextResponse.json(
      { detail: "Failed to process document" },
      { status: 500 }
    );
  }
}
