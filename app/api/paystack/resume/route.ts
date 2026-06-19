/**
 * POST /api/paystack/resume
 * Body: { token: string }
 *
 * Resumes an abandoned/pending payment for a customer. Two paths:
 *   1. Re-verify with Paystack first — if the original attempt actually
 *      succeeded (race condition / lost webhook), mark paid + redirect.
 *   2. Otherwise: create a NEW attempt (N+1) with a fresh reference and
 *      return access_code so the popup opens immediately.
 */

import { NextResponse } from "next/server";
import {
    getPaymentByResumeToken,
    insertPaymentRow,
    nextAttemptForOrder,
    markPaymentPaid,
    logPaymentEvent,
} from "@/lib/payments";
import { runPostPaidFulfillment } from "@/lib/paymentFulfillment";
import {
    initializeTransaction,
    verifyTransaction,
    buildReference,
    DEFAULT_CHANNELS,
} from "@/lib/paystack";
import { getOrderById } from "@/lib/queries";
import { SITE_URL } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
    let body: { token?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const token = body.token?.trim();
    if (!token) {
        return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
    }

    const original = await getPaymentByResumeToken(token);
    if (!original) {
        return NextResponse.json({ success: false, error: "Invalid or expired link" }, { status: 404 });
    }

    // ── 1. Re-check the original reference with Paystack first ──
    try {
        const verify = await verifyTransaction(original.reference);
        if (verify.status === "success" && verify.amount >= original.total_charged_kobo) {
            const updated = await markPaymentPaid(original.reference, verify, "verify", verify as unknown as Record<string, unknown>);
            if (updated) {
                await runPostPaidFulfillment(updated, verify);
            }
            return NextResponse.json({
                success: true,
                alreadyPaid: true,
                reference: original.reference,
                orderId: original.order_id,
            });
        }
    } catch {
        // Paystack 5xx — fall through and start a new attempt
    }

    if (!original.order_id) {
        return NextResponse.json({ success: false, error: "Cannot resume a non-order payment" }, { status: 400 });
    }

    const order = await getOrderById(original.order_id);
    if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // ── 2. Open a fresh attempt (N+1) with a new reference ──
    const attempt = await nextAttemptForOrder(order.id);
    const reference = buildReference(order.id, attempt);
    const callbackUrl = `${SITE_URL.replace(/\/$/, "")}/checkout/verify`;

    const initPayload = {
        email: order.email,
        amountKobo: original.total_charged_kobo,
        reference,
        callbackUrl,
        channels: DEFAULT_CHANNELS,
        metadata: {
            order_id: order.id,
            attempt,
            resumed_from: original.reference,
            base_amount_kobo: original.amount_kobo,
            processing_fee_kobo: original.processing_fee_kobo,
        },
    };

    let init;
    try {
        init = await initializeTransaction(initPayload);
    } catch (err) {
        await logPaymentEvent({
            reference,
            eventType: "resume.initialize_failed",
            source: "initialize",
            payload: { error: String(err), order_id: order.id, resumed_from: original.reference },
        });
        return NextResponse.json(
            { success: false, error: "Could not start a new payment attempt", detail: String(err) },
            { status: 502 },
        );
    }

    await insertPaymentRow({
        reference,
        orderId: order.id,
        customerId: original.customer_id,
        customerEmail: original.customer_email,
        amountKobo: original.amount_kobo,
        processingFeeKobo: original.processing_fee_kobo,
        totalChargedKobo: original.total_charged_kobo,
        paystackAccessCode: init.access_code,
        metadata: { resumed_from: original.reference, attempt },
        initializePayload: initPayload,
    });

    await logPaymentEvent({
        reference,
        eventType: "resume.new_attempt",
        source: "initialize",
        payload: { resumed_from: original.reference, attempt },
    });

    return NextResponse.json({
        success: true,
        alreadyPaid: false,
        reference,
        accessCode: init.access_code,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        orderId: order.id,
        totalCharged: original.total_charged_kobo / 100,
    });
}
