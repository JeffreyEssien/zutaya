/**
 * Payments data layer — wraps Supabase access to payments, payment_events,
 * customers, and the order/payment status transitions that must run exactly once.
 */

import crypto from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { Order } from "@/types";
import { findOrCreateCustomer, type VerifyResponse } from "@/lib/paystack";

// ═══ Types ═══

export interface PaymentRow {
    id: string;
    reference: string;
    order_id: string | null;
    subscription_id: string | null;
    customer_id: string | null;
    customer_email: string;
    amount_kobo: number;
    processing_fee_kobo: number;
    total_charged_kobo: number;
    currency: string;
    status: "pending" | "paid" | "failed" | "abandoned" | "refunded" | "partially_refunded";
    channel: string | null;
    paystack_fees_kobo: number | null;
    authorization_code: string | null;
    paystack_transaction_id: number | null;
    paystack_access_code: string | null;
    paid_at: string | null;
    failed_at: string | null;
    failure_reason: string | null;
    refund_status: "pending" | "processed" | "failed" | null;
    refunded_amount_kobo: number;
    refunded_at: string | null;
    refund_reference: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    resume_token?: string | null;
    reconciled_at?: string | null;
    stock_restored_at?: string | null;
    resume_email_sent_at?: string | null;
}

// ═══ Customer upsert ═══

export async function upsertCustomerFromOrder(order: Pick<Order, "email" | "customerName" | "phone">): Promise<{
    customerId: string | null;
    paystackCustomerCode: string | null;
}> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return { customerId: null, paystackCustomerCode: null };

    const email = order.email.toLowerCase().trim();
    const [firstName, ...rest] = order.customerName.trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;

    // 1. Find existing customer row
    const { data: existing } = await supabase
        .from("customers")
        .select("id, paystack_customer_code")
        .eq("email", email)
        .maybeSingle();

    // 2. Ensure Paystack customer exists
    let paystackCode = existing?.paystack_customer_code as string | null | undefined;
    if (!paystackCode) {
        try {
            const p = await findOrCreateCustomer({
                email,
                first_name: firstName,
                last_name: lastName,
                phone: order.phone,
            });
            paystackCode = p.customer_code;
        } catch (err) {
            console.warn("Paystack customer create failed (non-fatal):", err);
        }
    }

    // 3. Upsert local row
    if (existing?.id) {
        if (paystackCode && paystackCode !== existing.paystack_customer_code) {
            await supabase
                .from("customers")
                .update({ paystack_customer_code: paystackCode })
                .eq("id", existing.id);
        }
        return { customerId: existing.id, paystackCustomerCode: paystackCode ?? null };
    }

    const { data: inserted } = await supabase
        .from("customers")
        .insert({
            email,
            first_name: firstName,
            last_name: lastName,
            phone: order.phone,
            paystack_customer_code: paystackCode,
        })
        .select("id")
        .single();

    return { customerId: inserted?.id ?? null, paystackCustomerCode: paystackCode ?? null };
}

// ═══ Reference attempt counter ═══

export async function nextAttemptForOrder(orderId: string): Promise<number> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return 1;
    const { count } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("order_id", orderId);
    return (count ?? 0) + 1;
}

// ═══ Insert payment (initialize) ═══

export interface InsertPaymentArgs {
    reference: string;
    orderId?: string | null;
    subscriptionId?: string | null;
    customerId?: string | null;
    customerEmail: string;
    amountKobo: number;
    processingFeeKobo: number;
    totalChargedKobo: number;
    paystackAccessCode?: string | null;
    metadata?: Record<string, unknown>;
    initializePayload?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export async function insertPaymentRow(args: InsertPaymentArgs): Promise<PaymentRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;
    const { data, error } = await supabase
        .from("payments")
        .insert({
            reference: args.reference,
            order_id: args.orderId ?? null,
            subscription_id: args.subscriptionId ?? null,
            customer_id: args.customerId ?? null,
            customer_email: args.customerEmail,
            amount_kobo: args.amountKobo,
            processing_fee_kobo: args.processingFeeKobo,
            total_charged_kobo: args.totalChargedKobo,
            paystack_access_code: args.paystackAccessCode ?? null,
            metadata: args.metadata ?? {},
            initialize_payload: args.initializePayload ?? null,
            ip_address: args.ipAddress ?? null,
            user_agent: args.userAgent ?? null,
            status: "pending",
        })
        .select("*")
        .single();
    if (error) {
        console.error("insertPaymentRow failed:", error);
        return null;
    }
    return data as PaymentRow;
}

// ═══ Idempotent transition to paid ═══
// Returns the updated row if THIS call flipped it from non-paid to paid.
// Returns null if the row was already paid (race winner already ran fulfillment).

export async function markPaymentPaid(
    reference: string,
    verify: VerifyResponse,
    source: "verify" | "webhook",
    payloadForLog: Record<string, unknown>,
): Promise<PaymentRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;

    // Atomic update: only flip if not already paid.
    const { data, error } = await supabase
        .from("payments")
        .update({
            status: "paid",
            channel: verify.channel,
            paystack_fees_kobo: verify.fees,
            authorization_code: verify.authorization?.authorization_code ?? null,
            paystack_transaction_id: verify.id,
            paid_at: verify.paid_at || new Date().toISOString(),
            verify_response: source === "verify" ? verify : undefined,
            webhook_payload: source === "webhook" ? payloadForLog : undefined,
        })
        .eq("reference", reference)
        .neq("status", "paid")
        .select("*")
        .single();

    // PGRST116 = no rows returned (already paid) — that's fine, we lost the race.
    if (error || !data) return null;

    // Log event for forensic audit
    await supabase.from("payment_events").insert({
        payment_id: data.id,
        reference,
        event_type: source === "webhook" ? "charge.success" : "verify.success",
        source,
        payload: payloadForLog,
    });

    return data as PaymentRow;
}

export async function markPaymentFailed(
    reference: string,
    reason: string,
    source: "verify" | "webhook",
    payload: Record<string, unknown>,
): Promise<PaymentRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("payments")
        .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            failure_reason: reason,
            verify_response: source === "verify" ? payload : undefined,
            webhook_payload: source === "webhook" ? payload : undefined,
        })
        .eq("reference", reference)
        .eq("status", "pending")
        .select("*")
        .single();

    if (error || !data) return null;

    await supabase.from("payment_events").insert({
        payment_id: data.id,
        reference,
        event_type: source === "webhook" ? "charge.failed" : "verify.failed",
        source,
        payload,
    });

    return data as PaymentRow;
}

// ═══ Refund transitions ═══

export async function markRefundPending(
    paymentId: string,
    refundReference: string,
    amountKobo: number,
    reason: string | undefined,
): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;

    await supabase
        .from("payments")
        .update({
            refund_status: "pending",
            refund_reference: refundReference,
            refund_reason: reason ?? null,
        })
        .eq("id", paymentId);

    await supabase.from("payment_events").insert({
        payment_id: paymentId,
        reference: refundReference,
        event_type: "refund.initiated",
        source: "admin",
        payload: { amount_kobo: amountKobo, reason },
    });
}

export async function markRefundProcessed(
    reference: string,
    amountKobo: number,
    payload: Record<string, unknown>,
): Promise<PaymentRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;

    const { data: existing } = await supabase
        .from("payments")
        .select("id, total_charged_kobo, refunded_amount_kobo")
        .eq("reference", reference)
        .maybeSingle();
    if (!existing) return null;

    const newRefunded = (existing.refunded_amount_kobo ?? 0) + amountKobo;
    const isFull = newRefunded >= existing.total_charged_kobo;

    const { data, error } = await supabase
        .from("payments")
        .update({
            refund_status: "processed",
            refunded_amount_kobo: newRefunded,
            refunded_at: new Date().toISOString(),
            status: isFull ? "refunded" : "partially_refunded",
        })
        .eq("id", existing.id)
        .select("*")
        .single();

    if (error) return null;

    await supabase.from("payment_events").insert({
        payment_id: existing.id,
        reference,
        event_type: "refund.processed",
        source: "webhook",
        payload,
    });

    return data as PaymentRow;
}

// ═══ Lookups ═══

export async function getPaymentByReference(reference: string): Promise<PaymentRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;
    const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("reference", reference)
        .maybeSingle();
    return (data as PaymentRow | null) ?? null;
}

export async function getPaymentsForOrder(orderId: string): Promise<PaymentRow[]> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return [];
    const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
    return (data as PaymentRow[]) ?? [];
}

// ═══ Order side-effect: mark payment confirmed ═══

export async function syncOrderPaymentConfirmed(orderId: string, reference: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    await supabase
        .from("orders")
        .update({
            payment_status: "payment_confirmed",
            payment_method: "paystack",
            paystack_reference: reference,
        })
        .eq("id", orderId);
}

// ═══ Resume-token helpers ═══

export async function ensureResumeToken(paymentId: string): Promise<string | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;
    const { data: existing } = await supabase
        .from("payments")
        .select("resume_token")
        .eq("id", paymentId)
        .maybeSingle();
    if (existing?.resume_token) return existing.resume_token;
    const token = crypto.randomBytes(32).toString("hex");
    const { error } = await supabase
        .from("payments")
        .update({ resume_token: token })
        .eq("id", paymentId);
    if (error) return null;
    return token;
}

export async function getPaymentByResumeToken(token: string): Promise<PaymentRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;
    const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("resume_token", token)
        .maybeSingle();
    return (data as PaymentRow | null) ?? null;
}

// ═══ Recovery: stale pending sweep helpers ═══

export async function getStalePendingPayments(olderThanMinutes: number, limit = 50): Promise<PaymentRow[]> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
    const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "pending")
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(limit);
    return (data as PaymentRow[]) ?? [];
}

export async function markReconciled(paymentId: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    await supabase
        .from("payments")
        .update({ reconciled_at: new Date().toISOString() })
        .eq("id", paymentId);
}

export async function markStockRestored(paymentId: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    await supabase
        .from("payments")
        .update({ stock_restored_at: new Date().toISOString() })
        .eq("id", paymentId);
}

export async function markAbandoned(reference: string, payload: Record<string, unknown>): Promise<PaymentRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;
    const { data, error } = await supabase
        .from("payments")
        .update({
            status: "abandoned",
            abandoned_at: new Date().toISOString(),
            verify_response: payload,
        })
        .eq("reference", reference)
        .eq("status", "pending")
        .select("*")
        .single();
    if (error || !data) return null;
    await supabase.from("payment_events").insert({
        payment_id: data.id,
        reference,
        event_type: "payment.abandoned",
        source: "cron",
        payload,
    });
    return data as PaymentRow;
}

export async function markResumeEmailSent(paymentId: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    await supabase
        .from("payments")
        .update({ resume_email_sent_at: new Date().toISOString() })
        .eq("id", paymentId);
}

// ═══ Refund lock helpers ═══

export interface RefundLockResult {
    locked: boolean;
    totalChargedKobo?: number;
    refundedAmountKobo?: number;
    status?: string;
}

/**
 * Atomic refund lock. Returns locked=true if THIS call won the race; false otherwise.
 * Caller MUST release the lock if Paystack call fails (or fulfillment of the refund fails).
 */
export async function tryLockRefund(paymentId: string): Promise<RefundLockResult> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return { locked: false };
    const { data, error } = await supabase.rpc("try_lock_refund", { p_payment_id: paymentId });
    if (error || !data) return { locked: false };
    const r = data as {
        locked: boolean;
        total_charged_kobo?: number;
        refunded_amount_kobo?: number;
        status?: string;
    };
    return {
        locked: r.locked,
        totalChargedKobo: r.total_charged_kobo,
        refundedAmountKobo: r.refunded_amount_kobo,
        status: r.status,
    };
}

export async function releaseRefundLock(paymentId: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    await supabase.rpc("release_refund_lock", { p_payment_id: paymentId });
}

// ═══ Dispute helpers ═══

export interface DisputeRow {
    id: string;
    payment_id: string | null;
    reference: string;
    paystack_dispute_id: number | null;
    amount_kobo: number | null;
    currency: string | null;
    category: string | null;
    reason: string | null;
    status: string;
    resolution: string | null;
    bin: string | null;
    last4: string | null;
    transaction_amount: number | null;
    refund_amount: number | null;
    organization_decision: string | null;
    due_at: string | null;
    resolved_at: string | null;
    evidence_count: number | null;
    raw_create_payload: Record<string, unknown> | null;
    raw_last_payload: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

/** Insert (or update if Paystack ID already known) a dispute row. */
export async function upsertDispute(args: {
    paystackDisputeId: number;
    reference: string;
    paymentId: string | null;
    amountKobo: number | null;
    currency?: string;
    category?: string | null;
    reason?: string | null;
    status: string;
    resolution?: string | null;
    dueAt?: string | null;
    resolvedAt?: string | null;
    rawPayload: Record<string, unknown>;
    isCreate: boolean;
}): Promise<DisputeRow | null> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return null;

    const baseFields = {
        payment_id: args.paymentId,
        reference: args.reference,
        paystack_dispute_id: args.paystackDisputeId,
        amount_kobo: args.amountKobo,
        currency: args.currency ?? "NGN",
        category: args.category ?? null,
        reason: args.reason ?? null,
        status: args.status,
        resolution: args.resolution ?? null,
        due_at: args.dueAt ?? null,
        resolved_at: args.resolvedAt ?? null,
        raw_last_payload: args.rawPayload,
        ...(args.isCreate ? { raw_create_payload: args.rawPayload } : {}),
    };

    const { data, error } = await supabase
        .from("payment_disputes")
        .upsert(baseFields, { onConflict: "paystack_dispute_id" })
        .select("*")
        .single();

    if (error) {
        console.error("Failed to upsert dispute:", error);
        return null;
    }

    // Denormalize onto payments for fast filtering
    if (args.paymentId) {
        await supabase
            .from("payments")
            .update({
                dispute_status: args.status,
                dispute_due_at: args.dueAt ?? null,
            })
            .eq("id", args.paymentId);
    }

    return data as DisputeRow;
}

export async function getDisputesForPayment(paymentId: string): Promise<DisputeRow[]> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return [];
    const { data } = await supabase
        .from("payment_disputes")
        .select("*")
        .eq("payment_id", paymentId)
        .order("created_at", { ascending: false });
    return (data as DisputeRow[]) ?? [];
}

export async function listDisputes(args: { status?: string; limit?: number; offset?: number }): Promise<{ disputes: DisputeRow[]; total: number }> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return { disputes: [], total: 0 };
    let q = supabase
        .from("payment_disputes")
        .select("*", { count: "exact" })
        .order("due_at", { ascending: true, nullsFirst: false })
        .range(args.offset ?? 0, (args.offset ?? 0) + (args.limit ?? 50) - 1);
    if (args.status && args.status !== "all") q = q.eq("status", args.status);
    const { data, count } = await q;
    return { disputes: (data as DisputeRow[]) ?? [], total: count ?? 0 };
}

// ═══ Append-only event log (for non-payment-row events: bad sig, ignored events, etc.) ═══

export async function logPaymentEvent(args: {
    paymentId?: string | null;
    reference?: string | null;
    eventType: string;
    source: "webhook" | "verify" | "initialize" | "refund" | "admin" | "cron";
    payload: Record<string, unknown>;
}): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return;
    await supabase.from("payment_events").insert({
        payment_id: args.paymentId ?? null,
        reference: args.reference ?? null,
        event_type: args.eventType,
        source: args.source,
        payload: args.payload,
    });
}
