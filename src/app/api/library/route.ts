import { NextResponse } from "next/server";

import { listLibrary } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/library?page=1&pageSize=20&search= — paginated SOP library. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  return NextResponse.json(
    await listLibrary({
      page: Number(sp.get("page") ?? 1),
      pageSize: Number(sp.get("pageSize") ?? 20),
      search: sp.get("search") ?? undefined,
    })
  );
}
