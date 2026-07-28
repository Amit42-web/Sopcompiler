import { prisma } from "@/server/db";
import { logActivity } from "@/server/ingest";
import { getLatestRules } from "@/server/queries";
import { toEngineJson } from "@/server/rules-engine";
import type { RuleSet } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/files/:id/export — download the project's Rule Engine JSON. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await prisma.sopFile.findUnique({ where: { id } });
  if (!file) {
    return new Response(JSON.stringify({ detail: "File not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const rules = await getLatestRules(file.projectId);
  const ruleSet: RuleSet = {
    id: file.projectId,
    project_id: file.projectId,
    name: "Generated rule set",
    version: "1.0.0",
    rules,
    created_at: new Date().toISOString(),
  };

  await logActivity(
    "json_exported",
    `Exported Rule Engine JSON for “${file.filename}”`,
    file.projectId,
    file.id
  );

  const name = file.filename.replace(/\.[^.]+$/, "") || "ruleset";
  return new Response(JSON.stringify(toEngineJson(ruleSet), null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${name}.rules.json"`,
    },
  });
}
