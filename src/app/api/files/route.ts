import { NextResponse } from "next/server";

import type { SopFile } from "@/lib/types";
import { store } from "@/server/store";
import { newId } from "@/server/id";
import { parseDocument, UnsupportedFileError } from "@/server/parsing";

export const runtime = "nodejs";

/** GET /api/files — list every uploaded SOP in the workspace (newest first). */
export function GET() {
  return NextResponse.json(store.listAllFiles());
}

/** POST /api/files — upload + parse an SOP into the default workspace. */
export async function POST(req: Request) {
  const project = store.defaultProject();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: "multipart form field 'file' is required" },
      { status: 422 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const record: SopFile = {
    id: newId("file"),
    project_id: project.id,
    filename: file.name || "untitled",
    content_type: file.type || "application/octet-stream",
    size_bytes: bytes.byteLength,
    status: "uploaded",
    created_at: new Date().toISOString(),
  };

  try {
    const parsed = await parseDocument(
      record.filename,
      record.content_type,
      bytes
    );
    record.page_count = parsed.pageCount ?? undefined;
    record.char_count = parsed.charCount;
    record.status = "parsed";
    store.addFile(record, parsed.text);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    if (err instanceof UnsupportedFileError) {
      record.status = "error";
      store.addFile(record, "");
      return NextResponse.json({ detail: err.message }, { status: 415 });
    }
    return NextResponse.json(
      { detail: "Failed to parse document" },
      { status: 500 }
    );
  }
}
