/**
 * POST /api/paystack/subscription/disable
 * Body: { subscriptionId: string }  (our internal id)
 *
 * Cancels a Paystack subscription server-side, then flips local status to cancelled.
 * Admin-gated.
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin, logAdminAction } from "@/lib/adminAuth";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { disableSubscription } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { subscriptionId?: string; reason?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const subscriptionId = body.subscriptionId;
    if (!subscriptionId) {
        return NextResponse.json({ success: false, error: "Missing subscriptionId" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
        return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 });
    }

    const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscriptionId)
        .single();

    if (error || !sub) {
        return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }

    // If the subscription is Paystack-managed, call Paystack disable
    if (sub.paystack_subscription_code && sub.paystack_email_token) {
        try {
            await disableSubscription(sub.paystack_subscription_code, sub.paystack_email_token);
        } catch (err) {
            // Continue locally even if Paystack call fails — log it.
            console.error("Paystack disable failed:", err);
        }
    }

    await supabase
        .from("subscriptions")
        .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: body.reason ?? `cancelled_by_admin_${admin.email}`,
        })
        .eq("id", subscriptionId);

    await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        action: "subscription_cancel",
        entityType: "subscription",
        entityId: subscriptionId,
        details: `Cancelled subscription (Paystack code: ${sub.paystack_subscription_code ?? "n/a"})`,
    });

    return NextResponse.json({ success: true });
}
