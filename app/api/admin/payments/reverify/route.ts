/**
 * POST /api/admin/payments/reverify  (admin-only)
 * Body: { reference: string }
 *
 * Force-pings Paystack for the given reference and reconciles whatever we find.
 * Use this when a customer says "I was charged but my order still says pending."
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin, logAdminAction } from "@/lib/adminAuth";
import { verifyTransaction } from "@/lib/paystack";
import {
    getPaymentByReference,
    markPaymentPaid,
    markPaymentFailed,
    markAbandoned,
    markReconciled,
    logPaymentEvent,
} from "@/lib/payments";
import { runPostPaidFulfillment, runPostFailedCleanup, handleUnderpayment } from "@/lib/paymentFulfillment";

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

    let verify;
    try {
        verify = await verifyTransaction(reference);
    } catch (err) {
        await logPaymentEvent({
            paymentId: payment.id,
            reference,
            eventType: "admin.reverify_error",
            source: "admin",
            payload: { error: String(err), admin: admin.email },
        });
        return NextResponse.json(
            { success: false, error: "Paystack verify failed", detail: String(err) },
            { status: 502 },
        );
    }

    await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        action: "reverify",
        entityType: "payment",
        entityId: reference,
        details: `Force-reverified payment. Paystack status: ${verify.status}.`,
    });

    let resultStatus: string = payment.status;
    let changed = false;

    if (verify.status === "success") {
        if (payment.status === "paid") {
            resultStatus = "paid";
        } else if (verify.amount < payment.total_charged_kobo) {
            // Underpayment — auto-refund + notify + restore stock
            const ok = await handleUnderpayment(payment, verify, "admin");
            resultStatus = "failed";
            changed = ok;
        } else {
            const updated = await markPaymentPaid(reference, verify, "verify", verify as unknown as Record<string, unknown>);
            if (updated) {
                await runPostPaidFulfillment(updated, verify);
                resultStatus = "paid";
                changed = true;
            }
        }
    } else if (verify.status === "failed") {
        const updated = await markPaymentFailed(
            reference,
            verify.gateway_response || "reverify_failed",
            "verify",
            verify as unknown as Record<string, unknown>,
        );
        if (updated) {
            await runPostFailedCleanup(updated);
            resultStatus = "failed";
            changed = true;
        }
    } else if (verify.status === "abandoned") {
        const updated = await markAbandoned(reference, verify as unknown as Record<string, unknown>);
        if (updated) {
            await runPostFailedCleanup(updated);
            resultStatus = "abandoned";
            changed = true;
        }
    }

    await markReconciled(payment.id);

    return NextResponse.json({
        success: true,
        changed,
        paystackStatus: verify.status,
        localStatus: resultStatus,
        channel: verify.channel,
        paidAt: verify.paid_at,
    });
}
