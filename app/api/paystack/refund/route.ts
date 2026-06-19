/**
 * POST /api/paystack/refund — admin-only
 *
 * Body: { reference: string, amountKobo?: number, reason?: string }
 *  - amountKobo omitted = full refund of remaining.
 *  - Race-safe: uses atomic try_lock_refund RPC — two simultaneous admin
 *    clicks cannot both go through. Loser gets 409.
 */

import { NextResponse } from "next/server";
import { refundTransaction } from "@/lib/paystack";
import {
    getPaymentByReference,
    markRefundPending,
    tryLockRefund,
    releaseRefundLock,
    logPaymentEvent,
} from "@/lib/payments";
import { getCurrentAdmin, logAdminAction } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { reference?: string; amountKobo?: number; reason?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { reference, amountKobo, reason } = body;
    if (!reference) {
        return NextResponse.json({ success: false, error: "Missing reference" }, { status: 400 });
    }

    const payment = await getPaymentByReference(reference);
    if (!payment) {
        return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    // ── Take the atomic refund lock ──
    const lock = await tryLockRefund(payment.id);
    if (!lock.locked) {
        // Either: status not eligible, OR another refund is already in flight.
        return NextResponse.json(
            {
                success: false,
                error: payment.refund_status === "pending"
                    ? "A refund is already being processed for this payment. Please wait a moment and refresh."
                    : `Cannot refund a payment in status: ${payment.status}`,
            },
            { status: 409 },
        );
    }

    // Compute refund amount from FRESH values returned by the lock (avoids stale read)
    const totalCharged = lock.totalChargedKobo ?? payment.total_charged_kobo;
    const alreadyRefunded = lock.refundedAmountKobo ?? payment.refunded_amount_kobo;
    const remaining = totalCharged - alreadyRefunded;
    const amount = amountKobo ?? remaining;

    if (amount <= 0 || amount > remaining) {
        // Bad input — release the lock so admin can try again with valid amount
        await releaseRefundLock(payment.id);
        return NextResponse.json(
            {
                success: false,
                error: `Refund amount must be between ₦0.01 and ₦${(remaining / 100).toLocaleString()} (remaining after previous refunds).`,
            },
            { status: 400 },
        );
    }

    // ── Call Paystack (lock is held) ──
    let result;
    try {
        result = await refundTransaction({
            transaction: reference,
            amountKobo: amount,
            merchantNote: reason ?? `Refunded by ${admin.email}`,
        });
    } catch (err) {
        // Paystack refused — release the lock so a retry is possible
        await releaseRefundLock(payment.id);
        await logPaymentEvent({
            paymentId: payment.id,
            reference,
            eventType: "refund.paystack_error",
            source: "admin",
            payload: { error: String(err), amount_kobo: amount, admin: admin.email },
        });
        return NextResponse.json(
            { success: false, error: "Refund failed at Paystack", detail: String(err) },
            { status: 502 },
        );
    }

    // ── Persist the real refund_reference + reason (lock already set refund_status='pending') ──
    const refundRef = result.transaction?.reference || `refund-${Date.now()}`;
    await markRefundPending(payment.id, refundRef, amount, reason);

    await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        action: "refund",
        entityType: "payment",
        entityId: reference,
        details: `Refund ${amount / 100} NGN initiated. Reason: ${reason ?? "—"}`,
    });

    return NextResponse.json({
        success: true,
        refundStatus: result.status,
        amountKobo: amount,
        reference,
    });
}
