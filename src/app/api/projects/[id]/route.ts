import { NextResponse } from "next/server";

import { store } from "@/server/store";

/** GET /api/projects/:id — fetch a single project. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = store.getProject(id);
  if (!project) {
    return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}
