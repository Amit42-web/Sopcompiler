import { prisma } from "@/server/db";
import { logActivity } from "@/server/ingest";
import { getLatestStructured } from "@/server/queries";

export const runtime = "nodejs";

/** GET /api/files/:id/export — download the project's structured Rule Engine JSON. */
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

  const { rules, metadata_conditions, engine_tree } = await getLatestStructured(
    file.projectId
  );

  // Primary output is the executable Rule Engine decision tree. The structured
  // rules and metadata conditions are included for reference.
  const payload = {
    ...(engine_tree ?? { name: "Rule Engine", version: "1.0.0", root: null, blocks: [] }),
    metadata_conditions,
    extracted_rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      action_kind: r.action_kind,
      obligation: r.obligation,
      branch: r.branch,
      preconditions: r.preconditions,
      conditions: r.conditions,
      validation_prompt: r.validation_prompt,
      applies_to: r.applies_to,
      source_text: r.raw,
    })),
  };

  await logActivity(
    "json_exported",
    `Exported Rule Engine JSON for “${file.filename}”`,
    file.projectId,
    file.id
  );

  const name = file.filename.replace(/\.[^.]+$/, "") || "ruleset";
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${name}.rules.json"`,
    },
  });
}
