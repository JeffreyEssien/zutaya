import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOrder } from "@/lib/queries";
import type { Order } from "@/types";

export async function POST(request: Request) {
    try {
        // Verify admin session
        const cookieStore = await cookies();
        const session = cookieStore.get("admin_session")?.value;
        const secret = process.env.ADMIN_SESSION_SECRET;
        if (!secret) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

        if (session !== secret) {
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

        console.log(`\n🛍️ ADMIN ORDER CREATED: ${order.id}`);
        console.log(`   Customer: ${order.customerName} (${order.email})`);
        console.log(`   Total: ₦${order.total.toLocaleString()}`);

        return NextResponse.json({ success: true, orderId: order.id });
    } catch (err: any) {
        console.error("Admin order creation error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to create order" },
            { status: 500 }
        );
    }
}
