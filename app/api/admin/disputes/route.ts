/**
 * GET /api/admin/disputes  (admin-only)
 *
 * Query params:
 *   status = all | awaiting_evidence | pending | resolved | declined
 *   limit  = default 50
 *   offset = default 0
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { listDisputes } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const offset = Number(url.searchParams.get("offset") || 0);

    const { disputes, total } = await listDisputes({ status, limit, offset });

    return NextResponse.json({ success: true, total, disputes, limit, offset });
}
