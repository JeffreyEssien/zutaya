/**
 * POST /api/paystack/initialize
 *
 * Body: full Order payload from CheckoutForm (same shape as /api/orders).
 * Flow:
 *   0. Rate limit check (per IP + per email)
 *   1. Compute processing fee — adjust order.total accordingly
 *   2. Create order ATOMICALLY (stock + insert in one transaction)
 *      Per-product FOR UPDATE locks act as a natural per-product queue.
 *   3. Upsert customer + ensure Paystack customer_code
 *   4. Initialize Paystack transaction (server-side, secret key)
 *      ↳ If THIS step fails: restore stock + cancel order before returning
 *   5. Insert a `payments` ledger row (status=pending, reference=ZY-...-aN)
 *   6. Return { access_code, reference } so the client can open Inline popup
 */

import { NextResponse } from "next/server";
import type { Order } from "@/types";
import { createOrder, restoreStockForOrderAtomic } from "@/lib/queries";
import { getSupabaseServiceClient } from "@/lib/supabase";
import {
    initializeTransaction,
    customerProcessingFeeKobo,
    nairaToKobo,
    buildReference,
    DEFAULT_CHANNELS,
    validatePaymentEnv,
} from "@/lib/paystack";
import {
    insertPaymentRow,
    upsertCustomerFromOrder,
    nextAttemptForOrder,
    logPaymentEvent,
} from "@/lib/payments";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { SITE_URL } from "@/lib/constants";

export const runtime = "nodejs";

// Tunable thresholds — generous enough for honest users, tight enough to thwart bots.
const RL_IP_PER_MIN = 8;       // 8 init attempts per IP per minute
const RL_EMAIL_PER_HOUR = 15;  // 15 init attempts per email per hour

export async function POST(request: Request) {
    // ── 0a. Fail loud on misconfig BEFORE creating an order / deducting stock ──
    const envProblems = validatePaymentEnv();
    if (envProblems.length) {
        console.error("Payment env misconfigured:", envProblems.join("; "));
        return NextResponse.json(
            { success: false, error: "Payments are temporarily unavailable. Please try again shortly." },
            { status: 503 },
        );
    }

    // ── 0b. Rate limit (cheap and short-circuits abuse) ──
    const ip = getClientIp(request);
    const ipCheck = await checkRateLimit({
        key: `init:ip:${ip}`,
        limit: RL_IP_PER_MIN,
        windowSeconds: 60,
    });
    if (!ipCheck.allowed) {
        return NextResponse.json(
            { success: false, error: "Too many attempts. Please wait a moment and try again." },
            { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSeconds) } },
        );
    }

    let order: Order;
    try {
        order = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    if (!order?.id || !order.email || !order.total) {
        return NextResponse.json(
            { success: false, error: "Missing required order fields" },
            { status: 400 },
        );
    }

    const emailCheck = await checkRateLimit({
        key: `init:email:${order.email.toLowerCase()}`,
        limit: RL_EMAIL_PER_HOUR,
        windowSeconds: 3600,
    });
    if (!emailCheck.allowed) {
        return NextResponse.json(
            { success: false, error: "Too many checkout attempts for this email. Try again in an hour." },
            { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSeconds) } },
        );
    }

    // ── 1. Compute processing fee + grossed-up total ──
    const baseKobo = nairaToKobo(order.total);
    const processingFeeKobo = customerProcessingFeeKobo(baseKobo);
    const totalChargedKobo = baseKobo + processingFeeKobo;
    const processingFeeNaira = processingFeeKobo / 100;
    const grossedOrderTotal = order.total + processingFeeNaira;

    const orderWithFee: Order = {
        ...order,
        total: grossedOrderTotal,
        paymentMethod: "paystack",
        paymentStatus: "awaiting_payment",
        processingFee: processingFeeNaira,
    };

    // ── 2. Persist order atomically (per-product FOR UPDATE locks = natural queue) ──
    const supabase = getSupabaseServiceClient();
    let queueEntryId: string | null = null;
    if (supabase) {
        const { data } = await supabase
            .from("order_queue")
            .insert({ order_id: order.id, status: "queued" })
            .select("id")
            .single();
        queueEntryId = data?.id ?? null;
    }

    try {
        if (supabase && queueEntryId) {
            await supabase
                .from("order_queue")
                .update({ status: "processing", started_at: new Date().toISOString() })
                .eq("id", queueEntryId);
        }
        await createOrder(orderWithFee);

        // Best-effort delivery slot booking
        if (supabase && order.requestedDeliveryDate && order.requestedDeliverySlot) {
            try {
                await supabase.rpc("increment_delivery_capacity", {
                    p_date: order.requestedDeliveryDate,
                    p_slot: order.requestedDeliverySlot,
                });
            } catch (err) {
                console.warn("Delivery capacity increment failed:", err);
            }
        }

        if (supabase && queueEntryId) {
            await supabase
                .from("order_queue")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("id", queueEntryId);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (supabase && queueEntryId) {
            await supabase
                .from("order_queue")
                .update({
                    status: "failed",
                    error_message: msg,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", queueEntryId);
        }
        return NextResponse.json(
            { success: false, error: msg || "Order creation failed" },
            { status: 500 },
        );
    }

    // ── 3. Upsert customer + ensure Paystack customer_code ──
    const { customerId, paystackCustomerCode } = await upsertCustomerFromOrder({
        email: order.email,
        customerName: order.customerName,
        phone: order.phone,
    });

    // ── 4. Build reference + initialize Paystack ──
    const attempt = await nextAttemptForOrder(order.id);
    const reference = buildReference(order.id, attempt);

    const callbackUrl = `${SITE_URL.replace(/\/$/, "")}/checkout/verify`;
    const initializePayload = {
        email: order.email,
        amountKobo: totalChargedKobo,
        reference,
        callbackUrl,
        channels: DEFAULT_CHANNELS,
        customer: paystackCustomerCode ?? undefined,
        metadata: {
            order_id: order.id,
            customer_name: order.customerName,
            phone: order.phone,
            base_amount_kobo: baseKobo,
            processing_fee_kobo: processingFeeKobo,
            custom_fields: [
                { display_name: "Order ID", variable_name: "order_id", value: order.id },
                { display_name: "Customer", variable_name: "customer_name", value: order.customerName },
            ],
        },
    };

    let init: { access_code: string; reference: string; authorization_url: string };
    try {
        init = await initializeTransaction(initializePayload);
    } catch (err) {
        // ⚠️ Paystack init failed AFTER we already created the order + deducted stock.
        // Roll back: restore stock + mark order cancelled + log everything.
        console.error("Paystack initialize failed — rolling back order:", err);
        const restoreResult = await restoreStockForOrderAtomic(orderWithFee);
        if (supabase) {
            await supabase
                .from("orders")
                .update({
                    status: "cancelled",
                    payment_status: "failed",
                    notes: `Auto-cancelled: Paystack initialize failed. ${err instanceof Error ? err.message : String(err)}`,
                })
                .eq("id", order.id);
        }
        await logPaymentEvent({
            reference,
            eventType: "initialize.failed_rolled_back",
            source: "initialize",
            payload: {
                error: String(err),
                order_id: order.id,
                stock_restored: restoreResult.restored,
                stock_restore_error: restoreResult.error,
            },
        });
        return NextResponse.json(
            {
                success: false,
                error: "Payment provider is temporarily unavailable. Your stock has been released — please try again in a moment.",
                detail: err instanceof Error ? err.message : String(err),
            },
            { status: 502 },
        );
    }

    // ── 5. Insert payment row ──
    await insertPaymentRow({
        reference,
        orderId: order.id,
        customerId,
        customerEmail: order.email,
        amountKobo: baseKobo,
        processingFeeKobo,
        totalChargedKobo,
        paystackAccessCode: init.access_code,
        metadata: { order_id: order.id, attempt, customer_name: order.customerName },
        initializePayload,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
    });

    await logPaymentEvent({
        reference,
        eventType: "initialize.success",
        source: "initialize",
        payload: { access_code: init.access_code, authorization_url: init.authorization_url },
    });

    // ── 6. Return what the client needs to open the popup ──
    return NextResponse.json({
        success: true,
        reference,
        accessCode: init.access_code,
        authorizationUrl: init.authorization_url,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        orderId: order.id,
        processingFee: processingFeeNaira,
        totalCharged: grossedOrderTotal,
    });
}
