import { NextResponse } from "next/server";
import type { Order } from "@/types";
import { createOrder } from "@/lib/queries";
import { sendOrderEmails } from "@/lib/email";
import { processOrderInQueue } from "@/lib/orderQueue";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
    const order: Order = await request.json();
    const supabase = getSupabaseClient();

    // 1. Insert into queue tracker (so admin can see queue state)
    let queueEntryId: string | null = null;
    if (supabase) {
        const { data } = await supabase
            .from("order_queue")
            .insert({ order_id: order.id, status: "queued" })
            .select("id")
            .single();
        queueEntryId = data?.id || null;
    }

    // 2. Process through the serialized queue
    const result = await processOrderInQueue(async () => {
        // Mark as processing
        if (supabase && queueEntryId) {
            await supabase
                .from("order_queue")
                .update({ status: "processing", started_at: new Date().toISOString() })
                .eq("id", queueEntryId);
        }

        // Insert order + deduct stock (serialized — only one at a time)
        await createOrder(order);

        // Book delivery slot if requested (best-effort — don't fail the order)
        if (supabase && order.requestedDeliveryDate && order.requestedDeliverySlot) {
            try {
                await supabase.rpc("increment_delivery_capacity", {
                    p_date: order.requestedDeliveryDate,
                    p_slot: order.requestedDeliverySlot,
                });
            } catch (err) {
                console.warn("Delivery capacity increment failed:", err);
            }
        }

        // Send emails (non-blocking — don't fail the order if email fails)
        sendOrderEmails(order).catch((err) =>
            console.error("Email send failed:", err)
        );

        console.log(`🛍️ ORDER PLACED: ${order.id} — ${order.customerName} — ₦${order.total.toLocaleString()}`);

        return { orderId: order.id };
    });

    // 3. Update queue tracker with result
    if (supabase && queueEntryId) {
        await supabase
            .from("order_queue")
            .update({
                status: result.success ? "completed" : "failed",
                error_message: result.error || null,
                completed_at: new Date().toISOString(),
            })
            .eq("id", queueEntryId);
    }

    if (result.success) {
        return NextResponse.json({ success: true, orderId: order.id });
    }

    return NextResponse.json(
        { success: false, error: result.error || "Failed to process order" },
        { status: 500 }
    );
}
