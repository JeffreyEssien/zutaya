/**
 * GET /api/admin/payments/[reference]  (admin-only)
 *
 * Returns everything we know about a payment:
 *   - the payment row
 *   - all payment_events for forensic timeline
 *   - linked order
 *   - linked subscription
 *   - linked customer with lifetime stats
 *   - all other payments by the same customer (history)
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ reference: string }> },
) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
        return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 });
    }

    const { reference } = await params;

    const { data: payment, error } = await supabase
        .from("payments")
        .select("*")
        .eq("reference", decodeURIComponent(reference))
        .maybeSingle();

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    if (!payment) {
        return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    // Parallel fetch of related rows
    const [
        { data: events },
        { data: order },
        { data: subscription },
        { data: customer },
        { data: otherPayments },
    ] = await Promise.all([
        supabase
            .from("payment_events")
            .select("*")
            .eq("payment_id", payment.id)
            .order("created_at", { ascending: false })
            .limit(200),
        payment.order_id
            ? supabase.from("orders").select("*").eq("id", payment.order_id).maybeSingle()
            : Promise.resolve({ data: null }),
        payment.subscription_id
            ? supabase.from("subscriptions").select("*").eq("id", payment.subscription_id).maybeSingle()
            : Promise.resolve({ data: null }),
        payment.customer_id
            ? supabase.from("customers").select("*").eq("id", payment.customer_id).maybeSingle()
            : supabase.from("customers").select("*").eq("email", payment.customer_email).maybeSingle(),
        supabase
            .from("payments")
            .select("id,reference,status,total_charged_kobo,created_at,paid_at")
            .eq("customer_email", payment.customer_email)
            .neq("id", payment.id)
            .order("created_at", { ascending: false })
            .limit(20),
    ]);

    return NextResponse.json({
        success: true,
        payment,
        events: events ?? [],
        order,
        subscription,
        customer,
        otherPayments: otherPayments ?? [],
    });
}
