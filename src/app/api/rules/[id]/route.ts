import { NextResponse } from "next/server";

import { store } from "@/server/store";

/** GET /api/rules/:id — fetch a rule set. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleSet = store.getRuleSet(id);
  if (!ruleSet) {
    return NextResponse.json({ detail: "Rule set not found" }, { status: 404 });
  }
  return NextResponse.json(ruleSet);
}
