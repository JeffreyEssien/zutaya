/**
 * GET /api/paystack/verify?reference=ZY-...-aN
 *
 * Called by /checkout/verify after the Paystack popup resolves with onSuccess.
 *
 * Hits Paystack `/transaction/verify/:reference` server-side, then runs the
 * single idempotent transition that marks the payment as paid. If the webhook
 * already ran the transition, this call returns the existing paid row without
 * double-fulfilling.
 */

import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import {
    getPaymentByReference,
    markPaymentPaid,
    markPaymentFailed,
    syncOrderPaymentConfirmed,
    logPaymentEvent,
} from "@/lib/payments";
import { runPostPaidFulfillment, runPostFailedCleanup, handleUnderpayment } from "@/lib/paymentFulfillment";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
        return NextResponse.json(
            { success: false, error: "Missing reference" },
            { status: 400 },
        );
    }

    // ── 1. Look up our local payment row ──
    const existing = await getPaymentByReference(reference);
    if (!existing) {
        return NextResponse.json(
            { success: false, error: "Unknown payment reference" },
            { status: 404 },
        );
    }

    // Already settled — return the cached status (idempotent).
    if (existing.status === "paid" || existing.status === "refunded" || existing.status === "partially_refunded") {
        return NextResponse.json({
            success: true,
            alreadySettled: true,
            status: existing.status,
            reference,
            orderId: existing.order_id,
        });
    }
    if (existing.status === "failed") {
        return NextResponse.json({
            success: false,
            status: "failed",
            reference,
            orderId: existing.order_id,
            error: existing.failure_reason ?? "Payment failed",
        });
    }

    // ── 2. Verify with Paystack ──
    let verify;
    try {
        verify = await verifyTransaction(reference);
    } catch (err) {
        await logPaymentEvent({
            paymentId: existing.id,
            reference,
            eventType: "verify.error",
            source: "verify",
            payload: { error: String(err) },
        });
        return NextResponse.json(
            { success: false, error: "Verification failed", detail: String(err) },
            { status: 502 },
        );
    }

    // ── 3. Handle outcome ──
    if (verify.status !== "success") {
        const updated = await markPaymentFailed(reference, verify.gateway_response || verify.status, "verify", verify as unknown as Record<string, unknown>);
        if (updated) await runPostFailedCleanup(updated);
        return NextResponse.json({
            success: false,
            status: verify.status,
            reference,
            orderId: existing.order_id,
            error: verify.gateway_response || "Payment not successful",
        });
    }

    // ── 4. Underpayment: auto-refund + notify customer + restore stock ──
    if (verify.amount < existing.total_charged_kobo) {
        const ok = await handleUnderpayment(existing, verify, "verify");
        return NextResponse.json({
            success: false,
            status: "failed",
            reference,
            orderId: existing.order_id,
            error: ok
                ? "We received your payment but it was short of the order total. We've refunded what you paid and emailed you a link to complete the order properly."
                : "We received your payment but it was short of the order total. Our team has been alerted to refund you manually.",
        });
    }

    // ── 5. Idempotent transition to paid ──
    const updated = await markPaymentPaid(reference, verify, "verify", verify as unknown as Record<string, unknown>);
    if (updated) await runPostPaidFulfillment(updated, verify);

    return NextResponse.json({
        success: true,
        status: "paid",
        reference,
        orderId: existing.order_id,
        channel: verify.channel,
        paidAt: verify.paid_at,
    });
}
