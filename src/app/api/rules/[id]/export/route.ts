import { store } from "@/server/store";
import { exportJson, exportSummary } from "@/server/export";

/** GET /api/rules/:id/export?format=json|summary — download a rule set. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleSet = store.getRuleSet(id);
  if (!ruleSet) {
    return new Response(JSON.stringify({ detail: "Rule set not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const format = new URL(req.url).searchParams.get("format") ?? "json";

  if (format === "summary") {
    return new Response(exportSummary(ruleSet), {
      headers: {
        "content-type": "text/plain",
        "content-disposition": "attachment; filename=ruleset.txt",
      },
    });
  }

  return new Response(exportJson(ruleSet), {
    headers: {
      "content-type": "application/json",
      "content-disposition": "attachment; filename=ruleset.json",
    },
  });
}
