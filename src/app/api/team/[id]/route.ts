import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

export const runtime = "nodejs";

const ROLES = ["admin", "editor", "viewer"];

/** PATCH /api/team/:id — change a member's role. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await prisma.user.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ detail: "Member not found" }, { status: 404 });
  }
  if (member.role === "owner") {
    return NextResponse.json(
      { detail: "The workspace owner's role cannot be changed." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (!ROLES.includes(body.role)) {
    return NextResponse.json(
      { detail: `role must be one of ${ROLES.join(", ")}` },
      { status: 422 }
    );
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { role: body.role },
  });
  return NextResponse.json(updated);
}

/** DELETE /api/team/:id — remove a member. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await prisma.user.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ detail: "Member not found" }, { status: 404 });
  }
  if (member.role === "owner") {
    return NextResponse.json(
      { detail: "The workspace owner cannot be removed." },
      { status: 400 }
    );
  }
  await prisma.user.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
