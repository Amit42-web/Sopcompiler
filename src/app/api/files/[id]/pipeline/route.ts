import { NextResponse } from "next/server";

import { store } from "@/server/store";
import { runPipeline } from "@/server/pipeline";

export const runtime = "nodejs";

/** POST /api/files/:id/pipeline — run the AI pipeline over a parsed file. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = store.getFile(id);
  if (!record) {
    return NextResponse.json({ detail: "File not found" }, { status: 404 });
  }

  const text = store.getFileText(id) ?? "";
  if (!text.trim()) {
    return NextResponse.json(
      { detail: "File has no extractable text" },
      { status: 422 }
    );
  }

  record.status = "processing";
  const result = await runPipeline(id, text);
  store.savePipelineResult(result);
  record.status = "processed";
  return NextResponse.json(result);
}

/** GET /api/files/:id/pipeline — fetch a stored pipeline result. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = store.getPipelineResult(id);
  if (!result) {
    return NextResponse.json(
      { detail: "No pipeline result yet" },
      { status: 404 }
    );
  }
  return NextResponse.json(result);
}
