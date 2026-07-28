import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { listProjects } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects?page=1&pageSize=20 — paginated project list. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  return NextResponse.json(
    await listProjects({
      page: Number(sp.get("page") ?? 1),
      pageSize: Number(sp.get("pageSize") ?? 20),
    })
  );
}

/** POST /api/projects — create a project. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ detail: "name is required" }, { status: 422 });
  }
  const project = await prisma.project.create({
    data: {
      name,
      description: typeof body.description === "string" ? body.description : "",
    },
  });
  return NextResponse.json(project, { status: 201 });
}
