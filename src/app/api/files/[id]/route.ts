import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { logActivity, regenerateProjectRules } from "@/server/ingest";

export const runtime = "nodejs";

/** PATCH /api/files/:id — rename a SOP. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const filename =
    typeof body.filename === "string" ? body.filename.trim() : "";
  if (!filename) {
    return NextResponse.json({ detail: "filename is required" }, { status: 422 });
  }

  const file = await prisma.sopFile
    .update({ where: { id }, data: { filename } })
    .catch(() => null);
  if (!file) {
    return NextResponse.json({ detail: "File not found" }, { status: 404 });
  }
  await logActivity(
    "sop_renamed",
    `Renamed to “${filename}”`,
    file.projectId,
    file.id
  );
  return NextResponse.json(file);
}

/** DELETE /api/files/:id — delete a SOP (and re-generate the project's rules). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await prisma.sopFile.findUnique({ where: { id } });
  if (!file) {
    return NextResponse.json({ detail: "File not found" }, { status: 404 });
  }

  const filename = file.filename;
  const projectId = file.projectId;
  await prisma.sopFile.delete({ where: { id } });
  await regenerateProjectRules(projectId);
  await logActivity("sop_deleted", `Deleted “${filename}”`, projectId);
  return new Response(null, { status: 204 });
}
