import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/team — list workspace members (seeds the owner on first call). */
export async function GET() {
  let members = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  if (members.length === 0) {
    await prisma.user.create({
      data: {
        email: "you@workspace.local",
        name: "You",
        role: "owner",
        status: "active",
      },
    });
    members = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  }
  return NextResponse.json(members);
}
