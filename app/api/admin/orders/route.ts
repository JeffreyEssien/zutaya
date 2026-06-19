import { NextResponse } from "next/server";
import { createOrder } from "@/lib/queries";
import { getCurrentAdmin, logAdminAction } from "@/lib/adminAuth";
import type { Order } from "@/types";

export async function POST(request: Request) {
    try {
        // Verify admin session against admin_sessions (the canonical scheme).
        // NOTE: this previously compared the session cookie to ADMIN_SESSION_SECRET,
        // but the cookie holds a random session TOKEN, not that secret — so the old
        // check could never pass for a real admin. getCurrentAdmin() is the same
        // validation used by every other protected admin route.
        const admin = await getCurrentAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const order: Order = await request.json();

        // Validate required fields
        if (!order.id || !order.customerName || !order.email || !order.items?.length) {
            return NextResponse.json(
                { error: "Missing required fields: id, customerName, email, and at least one item" },
                { status: 400 }
            );
        }

        // Insert into Supabase (uses the same createOrder as checkout — minus stock deduction handled inside)
        await createOrder(order);

        await logAdminAction({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.name,
            action: "create_order",
            entityType: "order",
            entityId: order.id,
            details: `Manual order created — total ₦${order.total.toLocaleString()}`,
        });

        return NextResponse.json({ success: true, orderId: order.id });
    } catch (err: any) {
        console.error("Admin order creation error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to create order" },
            { status: 500 }
        );
    }
}
