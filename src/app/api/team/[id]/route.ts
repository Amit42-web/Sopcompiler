import { NextResponse } from "next/server";

import { store } from "@/server/store";

const ROLES = ["admin", "editor", "viewer"] as const;

/** PATCH /api/team/:id — change a member's role. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = store.getMember(id);
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
  const role = body.role;
  if (!ROLES.includes(role)) {
    return NextResponse.json(
      { detail: `role must be one of ${ROLES.join(", ")}` },
      { status: 422 }
    );
  }

  return NextResponse.json(store.updateMember(id, { role }));
}

/** DELETE /api/team/:id — remove a member. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = store.getMember(id);
  if (!member) {
    return NextResponse.json({ detail: "Member not found" }, { status: 404 });
  }
  if (member.role === "owner") {
    return NextResponse.json(
      { detail: "The workspace owner cannot be removed." },
      { status: 400 }
    );
  }

  store.removeMember(id);
  return new Response(null, { status: 204 });
}
