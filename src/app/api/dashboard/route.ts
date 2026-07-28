import { NextResponse } from "next/server";

import { dashboardStats } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/dashboard — live workspace statistics. */
export async function GET() {
  return NextResponse.json(await dashboardStats());
}
