import { NextResponse } from "next/server";

import { isAvailable } from "@/server/llm";

/** GET /api/health — service status + feature flags. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    llm_enabled: isAvailable(),
  });
}
