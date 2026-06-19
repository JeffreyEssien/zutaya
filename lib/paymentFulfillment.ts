/**
 * Shared post-paid fulfillment + post-failed cleanup used by:
 *   - /api/paystack/verify
 *   - /api/paystack/webhook
 *   - /api/paystack/resume
 *   - /api/admin/payments/reverify
 *   - /api/cron/paystack-reconcile
 *
 * The atomic UPDATE in markPaymentPaid / markPaymentFailed in lib/payments.ts
 * guarantees that only one caller flips status; this module is what runs the
 * side-effects after that winning transition.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";
import { getOrderById, restoreStockForOrderAtomic } from "@/lib/queries";
import { sendOrderEmails, sendUnderpaymentEmail } from "@/lib/email";
import {
    syncOrderPaymentConfirmed,
    markStockRestored,
    markPaymentFailed,
    ensureResumeToken,
    logPaymentEvent,
    type PaymentRow,
} from "@/lib/payments";
import { refundTransaction, type VerifyResponse } from "@/lib/paystack";
import { SITE_URL } from "@/lib/constants";

// Tolerance in kobo: ignore tiny overpayments (e.g. 100 = ₦1).
const OVERPAYMENT_TOLERANCE_KOBO = 100;

/** Run after a payment row flips to 'paid'. Safe to call concurrently — the
 *  atomic SQL transition above guarantees only one caller reaches this. */
export async function runPostPaidFulfillment(
    payment: PaymentRow,
    verify: VerifyResponse | undefined,
): Promise<void> {
    if (payment.order_id) {
        await syncOrderPaymentConfirmed(payment.order_id, payment.reference);
        try {
            const order = await getOrderById(payment.order_id);
            if (order) {
                sendOrderEmails(order).catch((err) =>
                    console.error("Receipt email failed:", err),
                );
            }
        } catch (err) {
            console.error("Post-paid fulfillment error:", err);
        }
    }

    // Subscription first-charge — store auth code for future renewals
    if (payment.subscription_id && verify?.authorization?.authorization_code) {
        const supabase = getSupabaseServiceClient();
        if (supabase) {
            await supabase
                .from("subscriptions")
                .update({
                    paystack_authorization_code: verify.authorization.authorization_code,
                    paystack_customer_code: verify.customer?.customer_code,
                    last_charge_at: verify.paid_at || new Date().toISOString(),
                    last_charge_status: "success",
                    status: "active",
                })
                .eq("id", payment.subscription_id);
        }
    }

    // ── Overpayment guard ──
    // Customer paid more than we charged → auto-refund the excess.
    // Don't refund tiny amounts (rounding); flag for admin if any refund happens.
    if (verify?.amount && verify.amount > payment.total_charged_kobo + OVERPAYMENT_TOLERANCE_KOBO) {
        const excessKobo = verify.amount - payment.total_charged_kobo;
        try {
            const result = await refundTransaction({
                transaction: payment.reference,
                amountKobo: excessKobo,
                merchantNote: `Auto-refund: customer overpaid by ${excessKobo / 100} NGN`,
                customerNote: "You overpaid — we're returning the difference automatically.",
            });
            await logPaymentEvent({
                paymentId: payment.id,
                reference: payment.reference,
                eventType: "overpayment.auto_refunded",
                source: "verify",
                payload: {
                    expected_kobo: payment.total_charged_kobo,
                    paid_kobo: verify.amount,
                    excess_kobo: excessKobo,
                    refund_status: result.status,
                },
            });
            console.warn(`💰 Overpayment auto-refunded for ${payment.reference}: excess ₦${excessKobo / 100}`);
        } catch (err) {
            // Don't fail fulfillment — log loud so admin can refund manually.
            console.error(`Auto-refund of overpayment FAILED for ${payment.reference}:`, err);
            await logPaymentEvent({
                paymentId: payment.id,
                reference: payment.reference,
                eventType: "overpayment.auto_refund_failed",
                source: "verify",
                payload: {
                    expected_kobo: payment.total_charged_kobo,
                    paid_kobo: verify.amount,
                    excess_kobo: excessKobo,
                    error: String(err),
                },
            });
        }
    }
}

/**
 * Customer paid LESS than the expected total via Paystack.
 *
 * Strategy: refund whatever they paid back to their card, mark the payment failed,
 * restore stock, and email them with a resume link so they can retry properly.
 * This avoids the worst case (money at Paystack + no order + no notification).
 *
 * Concurrency: verify (browser redirect), the charge.success webhook, AND the
 * reconcile cron can all detect the same underpayment at once. To guarantee the
 * refund is issued EXACTLY ONCE, we first claim the payment with the atomic
 * `markPaymentFailed` transition (pending→failed). Only the single caller that
 * wins that race proceeds to refund + restore stock + email; everyone else
 * returns early. (The previous order — refund first, mark failed second — had no
 * guard and could fire two refunds for the same transaction.)
 *
 * Returns true if handled (either we issued the refund, or someone else already
 * claimed it). Returns false only if WE won the claim but the Paystack refund
 * call failed — the row is left failed + flagged loudly for manual intervention.
 *
 * Caller should NOT also mark payment paid or run normal fulfillment when this runs.
 */
export async function handleUnderpayment(
    payment: PaymentRow,
    verify: VerifyResponse,
    source: "verify" | "webhook" | "cron" | "admin",
): Promise<boolean> {
    const paidKobo = verify.amount;
    const expectedKobo = payment.total_charged_kobo;
    const txnSource = source === "webhook" ? "webhook" : "verify";

    // ── 1. Atomically CLAIM the payment (pending → failed). Only one caller wins. ──
    const failed = await markPaymentFailed(
        payment.reference,
        `underpaid: ${paidKobo / 100} of ${expectedKobo / 100} NGN`,
        txnSource,
        verify as unknown as Record<string, unknown>,
    );

    if (!failed) {
        // Lost the race (or row no longer pending) — another path owns the refund.
        await logPaymentEvent({
            paymentId: payment.id,
            reference: payment.reference,
            eventType: "underpayment.claim_skipped",
            source,
            payload: { paid_kobo: paidKobo, expected_kobo: expectedKobo, reason: "already_claimed" },
        });
        return true;
    }

    await logPaymentEvent({
        paymentId: failed.id,
        reference: failed.reference,
        eventType: "underpayment.detected",
        source,
        payload: { paid_kobo: paidKobo, expected_kobo: expectedKobo, gateway: verify.gateway_response },
    });

    // ── 2. We own it: restore stock + cancel order (idempotent on stock_restored_at) ──
    await runPostFailedCleanup(failed);

    // ── 3. Refund what they paid (so money goes back to the customer's card) ──
    let refundOk = false;
    try {
        const result = await refundTransaction({
            transaction: failed.reference,
            amountKobo: paidKobo,
            merchantNote: `Auto-refund: customer underpaid (paid ${paidKobo / 100} of ${expectedKobo / 100} NGN)`,
            customerNote: "Your payment was short of the order total. We've returned what you paid.",
        });
        refundOk = true;
        await logPaymentEvent({
            paymentId: failed.id,
            reference: failed.reference,
            eventType: "underpayment.auto_refunded",
            source,
            payload: { refund_status: result.status, amount_kobo: paidKobo },
        });
    } catch (err) {
        // Refund failed AFTER we claimed the row — money is still at Paystack.
        // Log loudly so admin can refund manually from the dashboard. We do NOT
        // re-open the row (that would risk a double refund from another path).
        console.error(`🚨 Underpayment auto-refund FAILED for ${failed.reference}:`, err);
        await logPaymentEvent({
            paymentId: failed.id,
            reference: failed.reference,
            eventType: "underpayment.auto_refund_failed",
            source,
            payload: { paid_kobo: paidKobo, expected_kobo: expectedKobo, error: String(err), action_required: "manual_refund" },
        });
    }

    // ── 4. Send customer email with resume link so they can complete the order properly ──
    try {
        if (failed.order_id) {
            const order = await getOrderById(failed.order_id);
            if (order) {
                let resumeUrl: string | null = null;
                const token = await ensureResumeToken(failed.id);
                if (token) {
                    resumeUrl = `${SITE_URL.replace(/\/$/, "")}/checkout/resume?token=${encodeURIComponent(token)}`;
                }
                await sendUnderpaymentEmail(
                    order,
                    paidKobo / 100,
                    expectedKobo / 100,
                    resumeUrl,
                );
            }
        }
    } catch (err) {
        console.error("Underpayment email failed:", err);
    }

    return refundOk;
}

/** Run after a payment row flips to 'failed' or 'abandoned'. Restores stock
 *  atomically and bumps the order to a failed payment_status. */
export async function runPostFailedCleanup(payment: PaymentRow): Promise<void> {
    if (!payment.order_id) return;
    if (payment.stock_restored_at) return; // already done

    try {
        const order = await getOrderById(payment.order_id);
        if (order) {
            const { restored, error } = await restoreStockForOrderAtomic(order);
            if (error) {
                console.warn(`Stock restore for ${order.id} reported error:`, error);
            }
            await markStockRestored(payment.id);
            console.log(`Restored stock for order ${order.id}: ${restored} items`);
        }
    } catch (err) {
        console.error(`Stock restore failed for payment ${payment.id}:`, err);
    }

    const supabase = getSupabaseServiceClient();
    if (supabase) {
        // Mark order cancelled (was previously stuck in 'pending'). Only do
        // this if the order is still in 'pending' — don't override processing/etc.
        await supabase
            .from("orders")
            .update({
                payment_status: "failed",
                status: "cancelled",
            })
            .eq("id", payment.order_id)
            .eq("status", "pending");
    }
}
