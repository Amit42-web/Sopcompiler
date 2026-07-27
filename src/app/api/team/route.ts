import { NextResponse } from "next/server";

import { store } from "@/server/store";

/** GET /api/team — list team members. */
export function GET() {
  return NextResponse.json(store.listMembers());
}
