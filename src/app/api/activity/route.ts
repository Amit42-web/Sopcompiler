import { NextResponse } from "next/server";

import { recentActivity } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/activity?limit=20 — recent activity feed. */
export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 20);
  return NextResponse.json(await recentActivity(limit));
}
