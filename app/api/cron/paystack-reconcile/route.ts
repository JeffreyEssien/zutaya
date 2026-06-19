/**
 * GET /api/cron/paystack-reconcile  (Vercel Cron — every 15 min)
 *
 * For each `payments` row stuck in 'pending' for > 15 minutes, ask Paystack
 * what really happened and bring our DB in line.
 *
 *  - Paystack says success → mark paid + run fulfillment (idempotent)
 *  - Paystack says failed  → mark failed + restore stock
 *  - Paystack says abandoned and our row is > 24 h old →
 *      mark abandoned + restore stock + send "complete your order" email
 *      with a resume token (one email per payment, ever).
 *  - Anything else (still pending, e.g. bank_transfer not yet paid) → leave.
 */

import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import {
    getStalePendingPayments,
    markPaymentPaid,
    markPaymentFailed,
    markAbandoned,
    markReconciled,
    ensureResumeToken,
    markResumeEmailSent,
    logPaymentEvent,
    type PaymentRow,
} from "@/lib/payments";
import { runPostPaidFulfillment, runPostFailedCleanup, handleUnderpayment } from "@/lib/paymentFulfillment";
import { sendResumePaymentEmail } from "@/lib/email";
import { getOrderById } from "@/lib/queries";
import { logCronEvent } from "@/lib/adminAuth";

export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;

// Time thresholds
// Cron runs every 5 min (vercel.json); 10-min staleness means abandoned-card
// stock is released within ~10–15 min. Verifying a legitimately in-flight bank
// transfer this early just returns `pending`, so we leave those alone.
const STALE_AFTER_MIN = 10;
const ABANDONED_AFTER_HOURS = 24;

export async function GET(request: Request) {
    // Auth: require a matching Bearer secret. If CRON_SECRET is unset we MUST NOT
    // expose this endpoint publicly in production — fail closed instead of open.
    // (Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`.)
    if (CRON_SECRET) {
        const auth = request.headers.get("authorization");
        if (auth !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    } else if (process.env.NODE_ENV === "production") {
        console.error("CRON_SECRET is not set — refusing to run paystack-reconcile unauthenticated in production.");
        return NextResponse.json(
            { error: "Cron not configured (CRON_SECRET missing)" },
            { status: 401 },
        );
    }

    const stale = await getStalePendingPayments(STALE_AFTER_MIN, 50);
    if (stale.length === 0) {
        await logCronEvent({
            jobName: "paystack_reconcile",
            status: "skipped",
            details: "No stale pending payments",
        });
        return NextResponse.json({ checked: 0, message: "Nothing to reconcile" });
    }

    let paid = 0;
    let failed = 0;
    let abandoned = 0;
    let stillPending = 0;
    const errors: string[] = [];

    for (const payment of stale) {
        try {
            const summary = await reconcileOne(payment);
            if (summary === "paid") paid++;
            else if (summary === "failed") failed++;
            else if (summary === "abandoned") abandoned++;
            else stillPending++;
            await markReconciled(payment.id);
        } catch (err) {
            errors.push(`${payment.reference}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    const status = errors.length ? "error" : "success";
    const headline = `paid:${paid} failed:${failed} abandoned:${abandoned} still_pending:${stillPending} errors:${errors.length}`;
    await logCronEvent({
        jobName: "paystack_reconcile",
        status,
        details: `${headline}${errors.length ? ` | ${errors.join("; ")}` : ""}`,
    });

    return NextResponse.json({
        checked: stale.length,
        paid,
        failed,
        abandoned,
        stillPending,
        errors: errors.length,
    });
}

async function reconcileOne(
    payment: PaymentRow,
): Promise<"paid" | "failed" | "abandoned" | "still_pending"> {
    let verify;
    try {
        verify = await verifyTransaction(payment.reference);
    } catch (err) {
        // Paystack might transiently 5xx — leave row alone, log, retry next tick
        await logPaymentEvent({
            paymentId: payment.id,
            reference: payment.reference,
            eventType: "reconcile.verify_error",
            source: "cron",
            payload: { error: String(err) },
        });
        return "still_pending";
    }

    // ── Paystack says paid ──
    if (verify.status === "success") {
        if (verify.amount < payment.total_charged_kobo) {
            // Underpayment — auto-refund + notify customer + restore stock
            await handleUnderpayment(payment, verify, "cron");
            return "failed";
        }
        const updated = await markPaymentPaid(payment.reference, verify, "verify", verify as unknown as Record<string, unknown>);
        if (updated) {
            await runPostPaidFulfillment(updated, verify);
        }
        return "paid";
    }

    // ── Paystack says failed or reversed (both terminal — money not collected) ──
    if (verify.status === "failed" || verify.status === "reversed") {
        const updated = await markPaymentFailed(
            payment.reference,
            verify.gateway_response || `reconcile_${verify.status}`,
            "verify",
            verify as unknown as Record<string, unknown>,
        );
        if (updated) await runPostFailedCleanup(updated);
        return "failed";
    }

    // ── Paystack says abandoned (or still pending) ──
    // If it's been pending for > ABANDONED_AFTER_HOURS, treat as abandoned.
    // Note: only `abandoned` (or the age fallback) releases stock here. Genuinely
    // in-flight states (`pending`/`ongoing`/`processing`/`queued`, e.g. a customer
    // still completing a bank transfer) are intentionally left to settle.
    const ageHours = (Date.now() - new Date(payment.created_at).getTime()) / 3_600_000;
    if (verify.status === "abandoned" || ageHours > ABANDONED_AFTER_HOURS) {
        const updated = await markAbandoned(payment.reference, verify as unknown as Record<string, unknown>);
        if (updated) {
            await runPostFailedCleanup(updated);
            await maybeSendResumeEmail(updated);
        }
        return "abandoned";
    }

    // Otherwise: still pending (e.g. bank_transfer awaiting customer action)
    // Send resume email once if we haven't (only after 1 hour pending).
    if (!payment.resume_email_sent_at && ageHours > 1) {
        await maybeSendResumeEmail(payment);
    }
    return "still_pending";
}

async function maybeSendResumeEmail(payment: PaymentRow): Promise<void> {
    if (payment.resume_email_sent_at || !payment.order_id) return;
    const token = await ensureResumeToken(payment.id);
    if (!token) return;
    const order = await getOrderById(payment.order_id);
    if (!order) return;
    try {
        await sendResumePaymentEmail(order, token, payment.total_charged_kobo / 100);
        await markResumeEmailSent(payment.id);
        await logPaymentEvent({
            paymentId: payment.id,
            reference: payment.reference,
            eventType: "resume_email.sent",
            source: "cron",
            payload: { order_id: order.id, token_preview: token.slice(0, 8) },
        });
    } catch (err) {
        console.error("Resume email failed:", err);
    }
}
