import { NextResponse } from "next/server";

import { store } from "@/server/store";
import { generateRuleSet } from "@/server/rules-engine";

/** POST /api/projects/:id/rules — generate a rule set from pipeline results. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!store.getProject(id)) {
    return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }

  const results = store.listPipelineResults(id);
  if (results.length === 0) {
    return NextResponse.json(
      {
        detail:
          "Run the pipeline on at least one file before generating rules.",
      },
      { status: 422 }
    );
  }

  const ruleSet = generateRuleSet(id, results);
  store.saveRuleSet(ruleSet);
  return NextResponse.json(ruleSet);
}
