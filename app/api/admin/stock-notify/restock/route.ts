/**
 * POST /api/admin/stock-notify/restock  (admin-only)
 * Body: { productId?: string, inventoryItemId?: string }
 * Fired by the admin UI after a stock-affecting save. Emails any pending
 * back-in-stock subscribers if the product/variant is now available.
 * Idempotent and safe to call repeatedly.
 */
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { notifyRestockIfAvailable, notifyRestockForInventoryItem } from "@/lib/stockNotifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: any = {};
    try { body = await request.json(); } catch { /* empty body ok */ }

    if (body.productId) await notifyRestockIfAvailable(String(body.productId));
    if (body.inventoryItemId) await notifyRestockForInventoryItem(String(body.inventoryItemId));

    return NextResponse.json({ success: true });
}
