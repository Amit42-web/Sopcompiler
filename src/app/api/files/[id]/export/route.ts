import { prisma } from "@/server/db";
import { logActivity } from "@/server/ingest";
import { getLatestBuildSpec } from "@/server/queries";

export const runtime = "nodejs";

/** GET /api/files/:id/export — download the project's rule_engine_build_spec JSON. */
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

  const buildSpec = await getLatestBuildSpec(file.projectId);

  await logActivity(
    "json_exported",
    `Exported Rule Engine JSON for “${file.filename}”`,
    file.projectId,
    file.id
  );

  const name = file.filename.replace(/\.[^.]+$/, "") || "ruleset";
  // Minified so the file stays small for import into the rule engine.
  return new Response(JSON.stringify({ rule_engine_build_spec: buildSpec }), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${name}.rules.json"`,
    },
  });
}
