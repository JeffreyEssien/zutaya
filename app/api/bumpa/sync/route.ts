/**
 * Bumpa order sync.
 *
 *  POST /api/bumpa/sync  — pull Bumpa orders → stage → deduct stock for PAID,
 *                          fully-matched orders. Auth: admin session OR
 *                          `Authorization: Bearer <CRON_SECRET>` (for the cron).
 *  GET  /api/bumpa/sync   — admin only. Config status + recent staged orders.
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { bumpaConfigStatus } from "@/lib/bumpa";
import { getBumpaOrders, syncBumpaOrders } from "@/lib/bumpaSync";

export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;

async function isAuthorized(request: Request): Promise<boolean> {
    if (CRON_SECRET) {
        const auth = request.headers.get("authorization");
        if (auth === `Bearer ${CRON_SECRET}`) return true;
    }
    const admin = await getCurrentAdmin();
    return Boolean(admin);
}

export async function POST(request: Request) {
    if (!(await isAuthorized(request))) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const summary = await syncBumpaOrders();
    return NextResponse.json({ success: summary.ok, summary }, { status: summary.ok ? 200 : 502 });
}

export async function GET() {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const [config, orders] = await Promise.all([
        Promise.resolve(bumpaConfigStatus()),
        getBumpaOrders().catch(() => []),
    ]);
    return NextResponse.json({ success: true, config, orders });
}
