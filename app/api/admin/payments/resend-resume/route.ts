/**
 * POST /api/admin/payments/resend-resume  (admin-only)
 * Body: { reference: string }
 *
 * Manually re-send the "complete your payment" email to the customer.
 * Useful when reconcile cron skipped or the customer says they didn't get it.
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin, logAdminAction } from "@/lib/adminAuth";
import {
    getPaymentByReference,
    ensureResumeToken,
    markResumeEmailSent,
    logPaymentEvent,
} from "@/lib/payments";
import { getOrderById } from "@/lib/queries";
import { sendResumePaymentEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { reference?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const reference = body.reference;
    if (!reference) {
        return NextResponse.json({ success: false, error: "Missing reference" }, { status: 400 });
    }

    const payment = await getPaymentByReference(reference);
    if (!payment) {
        return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }
    if (!payment.order_id) {
        return NextResponse.json({ success: false, error: "Payment has no linked order" }, { status: 400 });
    }
    if (payment.status === "paid") {
        return NextResponse.json({ success: false, error: "Payment is already paid" }, { status: 400 });
    }

    const order = await getOrderById(payment.order_id);
    if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const token = await ensureResumeToken(payment.id);
    if (!token) {
        return NextResponse.json({ success: false, error: "Could not generate token" }, { status: 500 });
    }

    try {
        await sendResumePaymentEmail(order, token, payment.total_charged_kobo / 100);
        await markResumeEmailSent(payment.id);
        await logPaymentEvent({
            paymentId: payment.id,
            reference,
            eventType: "resume_email.admin_resend",
            source: "admin",
            payload: { admin: admin.email },
        });
        await logAdminAction({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.name,
            action: "resume_email_resend",
            entityType: "payment",
            entityId: reference,
            details: `Resent resume payment email to ${order.email}`,
        });
        return NextResponse.json({ success: true, sentTo: order.email });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: `Email send failed: ${String(err)}` },
            { status: 500 },
        );
    }
}
