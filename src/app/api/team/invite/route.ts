import { NextResponse } from "next/server";

import type { TeamMember } from "@/lib/types";
import { store } from "@/server/store";
import { newId } from "@/server/id";

/** POST /api/team/invite — invite a new member. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ detail: "email is required" }, { status: 422 });
  }

  const member: TeamMember = {
    id: newId("usr"),
    name: typeof body.name === "string" && body.name ? body.name : email.split("@")[0],
    email,
    role: typeof body.role === "string" ? body.role : "viewer",
    status: "invited",
  };
  return NextResponse.json(store.addMember(member), { status: 201 });
}
