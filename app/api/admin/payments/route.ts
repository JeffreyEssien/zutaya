/**
 * GET /api/admin/payments?orderId=ZY-...
 * Admin-only. Returns the full payment ledger (every attempt) for an order.
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getPaymentsForOrder } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
        return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 });
    }
    const payments = await getPaymentsForOrder(orderId);
    return NextResponse.json({ success: true, payments });
}
