import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { getProjectDetails } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects/:id — full project details (files + all artifacts). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const details = await getProjectDetails(id);
  if (!details) {
    return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(details);
}

/** PATCH /api/projects/:id — rename / edit description. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { name?: string; description?: string } = {};
  if (typeof body.name === "string" && body.name.trim())
    data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description;

  const project = await prisma.project
    .update({ where: { id }, data })
    .catch(() => null);
  if (!project) {
    return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

/** DELETE /api/projects/:id — delete a project and all its data (cascade). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await prisma.project
    .delete({ where: { id } })
    .catch(() => null);
  if (!deleted) {
    return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
