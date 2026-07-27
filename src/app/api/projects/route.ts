import { NextResponse } from "next/server";

import { store } from "@/server/store";

/** GET /api/projects — list all projects. */
export function GET() {
  return NextResponse.json(store.listProjects());
}

/** POST /api/projects — create a project. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ detail: "name is required" }, { status: 422 });
  }
  const project = store.createProject({
    name,
    description: typeof body.description === "string" ? body.description : "",
  });
  return NextResponse.json(project, { status: 201 });
}
