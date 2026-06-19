/**
 * POST /api/paystack/webhook
 *
 * Paystack server-to-server events. Signature: HMAC SHA512 of the RAW body
 * with PAYSTACK_SECRET_KEY, compared to `x-paystack-signature`. Always 200
 * quickly to prevent retries; do real work synchronously but defensively.
 *
 * Events handled:
 *   - charge.success                — idempotent transition to paid + fulfillment
 *   - charge.failed                 — mark failed (best effort)
 *   - subscription.create           — store subscription_code + email_token + auth_code
 *   - subscription.disable          — flip local subscription to cancelled
 *   - subscription.not_renew        — mark subscription will not renew
 *   - invoice.create / invoice.update / invoice.payment_failed — log only
 *   - refund.processed              — flip refund_status to processed
 *   - refund.failed                 — flip refund_status to failed
 *
 * Unknown events are logged and ignored (200 OK).
 */

import { NextResponse } from "next/server";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";
import {
    getPaymentByReference,
    markPaymentPaid,
    markPaymentFailed,
    markRefundProcessed,
    upsertDispute,
    logPaymentEvent,
} from "@/lib/payments";
import { runPostPaidFulfillment, runPostFailedCleanup, handleUnderpayment } from "@/lib/paymentFulfillment";
import { sendDisputeAlertEmail } from "@/lib/email";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

interface PaystackEvent {
    event: string;
    data: Record<string, unknown> & {
        reference?: string;
        amount?: number;
        status?: string;
        gateway_response?: string;
        channel?: string;
        paid_at?: string;
        fees?: number;
        customer?: { email?: string };
        authorization?: { authorization_code?: string };
        subscription_code?: string;
        email_token?: string;
        plan?: { plan_code?: string };
        transaction?: { reference?: string; amount?: number };
        // Dispute fields
        id?: number;
        category?: string;
        currency?: string;
        due_at?: string;
        resolved_at?: string;
        resolution?: string;
        bin?: string;
        last4?: string;
    };
}

export async function POST(request: Request) {
    const raw = await request.text();
    const sig = request.headers.get("x-paystack-signature");

    if (!verifyWebhookSignature(raw, sig)) {
        await logPaymentEvent({
            eventType: "webhook.bad_signature",
            source: "webhook",
            payload: { sig_header: sig ?? null, body_length: raw.length },
        });
        return new NextResponse("invalid signature", { status: 401 });
    }

    let event: PaystackEvent;
    try {
        event = JSON.parse(raw) as PaystackEvent;
    } catch {
        return new NextResponse("invalid json", { status: 400 });
    }

    // Log every webhook for audit (even ones we ignore)
    await logPaymentEvent({
        reference: event.data?.reference ?? event.data?.transaction?.reference ?? null,
        eventType: event.event,
        source: "webhook",
        payload: event.data as Record<string, unknown>,
    });

    try {
        switch (event.event) {
            case "charge.success":
                await handleChargeSuccess(event);
                break;
            case "charge.failed":
                await handleChargeFailed(event);
                break;
            case "subscription.create":
                await handleSubscriptionCreate(event);
                break;
            case "subscription.disable":
            case "subscription.not_renew":
                await handleSubscriptionDisable(event);
                break;
            case "refund.processed":
                await handleRefundProcessed(event);
                break;
            case "refund.failed":
                await handleRefundFailed(event);
                break;
            case "charge.dispute.create":
                await handleDispute(event, /* isCreate */ true);
                break;
            case "charge.dispute.remind":
            case "charge.dispute.resolve":
                await handleDispute(event, /* isCreate */ false);
                break;
            // invoice.* events are informational for now
            default:
                break;
        }
    } catch (err) {
        // Never throw to Paystack — log and return 200 so they don't retry-bomb us.
        console.error(`Webhook handler ${event.event} failed:`, err);
        await logPaymentEvent({
            reference: event.data?.reference ?? null,
            eventType: `${event.event}.handler_error`,
            source: "webhook",
            payload: { error: String(err) },
        });
    }

    return new NextResponse("ok", { status: 200 });
}

// ─── Handlers ───────────────────────────────────────────────────────

async function handleChargeSuccess(event: PaystackEvent) {
    const reference = event.data.reference;
    if (!reference) return;

    const existing = await getPaymentByReference(reference);
    if (!existing) return;

    if (existing.status === "paid") return; // already settled by verify

    // Re-verify against Paystack for trust (webhook payload can be partial)
    const verify = await verifyTransaction(reference);
    if (verify.status !== "success") return;

    // Underpayment — auto-refund + mark failed + notify customer
    if (verify.amount < existing.total_charged_kobo) {
        await handleUnderpayment(existing, verify, "webhook");
        return;
    }

    const updated = await markPaymentPaid(reference, verify, "webhook", event.data);
    if (updated) await runPostPaidFulfillment(updated, verify);
}

async function handleChargeFailed(event: PaystackEvent) {
    const reference = event.data.reference;
    if (!reference) return;
    const updated = await markPaymentFailed(
        reference,
        event.data.gateway_response || "charge_failed",
        "webhook",
        event.data,
    );
    if (updated) await runPostFailedCleanup(updated);
}

async function handleSubscriptionCreate(event: PaystackEvent) {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;

    const subscriptionCode = event.data.subscription_code;
    const emailToken = event.data.email_token;
    const planCode = event.data.plan?.plan_code;
    const customerEmail = event.data.customer?.email?.toLowerCase();
    const authCode = event.data.authorization?.authorization_code;

    if (!subscriptionCode || !customerEmail) return;

    // Match a local subscription by email + plan_code (most-recent active first)
    const { data: subs } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("customer_email", customerEmail)
        .eq("status", "active")
        .is("paystack_subscription_code", null)
        .order("created_at", { ascending: false })
        .limit(1);

    if (!subs || subs.length === 0) return;

    await supabase
        .from("subscriptions")
        .update({
            paystack_subscription_code: subscriptionCode,
            paystack_email_token: emailToken,
            paystack_plan_code: planCode,
            paystack_authorization_code: authCode,
        })
        .eq("id", subs[0].id);
}

async function handleSubscriptionDisable(event: PaystackEvent) {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    const code = event.data.subscription_code;
    if (!code) return;
    await supabase
        .from("subscriptions")
        .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: event.event,
        })
        .eq("paystack_subscription_code", code);
}

async function handleRefundProcessed(event: PaystackEvent) {
    const reference =
        event.data.transaction?.reference ?? event.data.reference;
    const amount = (event.data.amount as number | undefined) ?? 0;
    if (!reference) return;
    const updated = await markRefundProcessed(reference, amount, event.data);
    if (updated?.order_id) {
        // mark order as refunded — keep status (admin may have already cancelled)
        const supabase = getSupabaseServiceClient();
        if (supabase) {
            await supabase
                .from("orders")
                .update({ payment_status: updated.status === "refunded" ? "refunded" : "partially_refunded" })
                .eq("id", updated.order_id);
        }
    }
}

async function handleRefundFailed(event: PaystackEvent) {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    const reference =
        event.data.transaction?.reference ?? event.data.reference;
    if (!reference) return;
    await supabase
        .from("payments")
        .update({ refund_status: "failed" })
        .eq("reference", reference);
}

/**
 * Dispute / chargeback event handler.
 * Persists dispute row, denormalizes onto payments, and on `create` fires
 * an urgent admin email so support can respond before the deadline.
 */
async function handleDispute(event: PaystackEvent, isCreate: boolean): Promise<void> {
    const d = event.data;
    const paystackDisputeId = d.id;
    const reference = d.transaction?.reference ?? d.reference;
    if (!paystackDisputeId || !reference) return;

    const payment = await getPaymentByReference(reference);

    const disputeRow = await upsertDispute({
        paystackDisputeId,
        reference,
        paymentId: payment?.id ?? null,
        amountKobo: (d.transaction?.amount as number | undefined) ?? (d.amount as number | undefined) ?? null,
        currency: d.currency ?? "NGN",
        category: d.category ?? null,
        reason: (d.reason as string | undefined) ?? null,
        status: d.status ?? "awaiting_evidence",
        resolution: d.resolution ?? null,
        dueAt: d.due_at ?? null,
        resolvedAt: d.resolved_at ?? null,
        rawPayload: d as Record<string, unknown>,
        isCreate,
    });

    if (isCreate && disputeRow) {
        const amountKobo = disputeRow.amount_kobo ?? 0;
        sendDisputeAlertEmail({
            reference,
            orderId: payment?.order_id ?? null,
            customerEmail: payment?.customer_email ?? d.customer?.email ?? "unknown",
            amountNaira: amountKobo / 100,
            category: disputeRow.category ?? "unknown",
            reason: disputeRow.reason ?? null,
            dueAt: disputeRow.due_at,
            paystackDisputeId,
        }).catch((err) => console.error("Dispute alert email failed:", err));
    }
}
