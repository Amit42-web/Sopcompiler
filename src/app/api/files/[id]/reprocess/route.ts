import { NextResponse } from "next/server";

import { reprocessFile } from "@/server/ingest";

export const runtime = "nodejs";

/** POST /api/files/:id/reprocess — re-run the pipeline for a stored SOP. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    return NextResponse.json(await reprocessFile(id));
  } catch {
    return NextResponse.json({ detail: "File not found" }, { status: 404 });
  }
}
