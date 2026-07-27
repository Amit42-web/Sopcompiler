import { NextResponse } from "next/server";

import { store } from "@/server/store";
import { validateRuleSet } from "@/server/validation";

/** POST /api/rules/:id/validate — validate a rule set. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleSet = store.getRuleSet(id);
  if (!ruleSet) {
    return NextResponse.json({ detail: "Rule set not found" }, { status: 404 });
  }
  return NextResponse.json(validateRuleSet(ruleSet));
}
