import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

export const runtime = "nodejs";

/** POST /api/team/invite — invite a member as admin / editor / viewer. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ detail: "email is required" }, { status: 422 });
  }
  const role = ["admin", "editor", "viewer"].includes(body.role)
    ? body.role
    : "viewer";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { detail: "A member with that email already exists." },
      { status: 409 }
    );
  }

  const member = await prisma.user.create({
    data: {
      email,
      name: typeof body.name === "string" && body.name ? body.name : email.split("@")[0],
      role,
      status: "invited",
    },
  });
  return NextResponse.json(member, { status: 201 });
}
