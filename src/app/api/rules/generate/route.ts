import { NextResponse } from "next/server";

import { store } from "@/server/store";
import { generateRuleSet } from "@/server/rules-engine";

/**
 * POST /api/rules/generate — build a rule set from every processed document in
 * the workspace. Returns 422 if no document has been run through the pipeline
 * yet, so the UI can prompt the user to upload first.
 */
export function POST() {
  const results = store.listAllPipelineResults();
  if (results.length === 0) {
    return NextResponse.json(
      {
        detail:
          "No processed documents yet. Upload an SOP to generate rules from it.",
      },
      { status: 422 }
    );
  }

  const ruleSet = generateRuleSet(store.defaultProject().id, results);
  store.saveRuleSet(ruleSet);
  return NextResponse.json(ruleSet);
}
