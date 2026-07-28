import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { logActivity, regenerateProjectRules } from "@/server/ingest";

export const runtime = "nodejs";

/**
 * POST /api/files/:id/duplicate — clone a SOP and all its extracted artifacts
 * within the same project, then re-generate the project's rules.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const source = await prisma.sopFile.findUnique({
    where: { id },
    include: { metadata: true, sections: true, scenarios: true, knowledgeBase: true },
  });
  if (!source) {
    return NextResponse.json({ detail: "File not found" }, { status: 404 });
  }

  const copy = await prisma.sopFile.create({
    data: {
      projectId: source.projectId,
      filename: `${source.filename} (copy)`,
      contentType: source.contentType,
      sizeBytes: source.sizeBytes,
      status: source.status,
      version: 1,
      pageCount: source.pageCount,
      charCount: source.charCount,
      rawText: source.rawText,
      metadata: source.metadata
        ? {
            create: {
              title: source.metadata.title,
              department: source.metadata.department,
              version: source.metadata.version,
              effectiveDate: source.metadata.effectiveDate,
              owner: source.metadata.owner,
              tags: source.metadata.tags,
            },
          }
        : undefined,
      sections: {
        create: source.sections.map((s) => ({
          title: s.title,
          level: s.level,
          text: s.text,
          order: s.order,
        })),
      },
      scenarios: {
        create: source.scenarios.map((s) => ({
          condition: s.condition,
          resolution: s.resolution,
          resolutionGroup: s.resolutionGroup,
          confidence: s.confidence,
        })),
      },
      knowledgeBase: {
        create: source.knowledgeBase.map((k) => ({
          term: k.term,
          definition: k.definition,
          occurrences: k.occurrences,
        })),
      },
    },
  });

  await regenerateProjectRules(source.projectId);
  await logActivity(
    "sop_duplicated",
    `Duplicated “${source.filename}”`,
    source.projectId,
    copy.id
  );
  return NextResponse.json(copy, { status: 201 });
}
