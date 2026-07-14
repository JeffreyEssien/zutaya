/**
 * POST /api/stock-notify  (public)
 * Body: { productId: string, email: string, variant?: string }
 * Subscribes a customer to a back-in-stock alert for a sold-out product/variant.
 */
import { NextResponse } from "next/server";
import { subscribeStockNotification } from "@/lib/stockNotifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const productId = String(body.productId || "");
        const email = String(body.email || "");
        const variant = body.variant ? String(body.variant) : null;

        if (!productId || !email) {
            return NextResponse.json({ success: false, error: "Missing product or email" }, { status: 400 });
        }

        const result = await subscribeStockNotification({ productId, email, variantName: variant });
        return NextResponse.json({ success: true, alreadySubscribed: result.alreadySubscribed });
    } catch (err: any) {
        const msg = err?.message === "Invalid email address" ? err.message : "Could not subscribe";
        const status = err?.message === "Invalid email address" ? 400 : 500;
        return NextResponse.json({ success: false, error: msg }, { status });
    }
}
