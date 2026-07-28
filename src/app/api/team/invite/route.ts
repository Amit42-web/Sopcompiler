import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { sendInviteEmail, isEmailConfigured } from "@/server/mailer";

export const runtime = "nodejs";

/** POST /api/team/invite — invite a member and email them the invitation. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { detail: "A valid email is required" },
      { status: 422 }
    );
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
      name:
        typeof body.name === "string" && body.name
          ? body.name
          : email.split("@")[0],
      role,
      status: "invited",
      invitedAt: new Date(),
    },
  });

  // Send the invitation email (real send when SMTP is configured).
  const origin = new URL(req.url).origin;
  const { sent, error } = await sendInviteEmail({
    to: email,
    role,
    inviteUrl: `${origin}/dashboard`,
  });

  return NextResponse.json(
    {
      ...member,
      emailSent: sent,
      emailConfigured: isEmailConfigured(),
      emailError: error,
    },
    { status: 201 }
  );
}
