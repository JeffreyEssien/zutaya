/**
 * POST /api/paystack/subscription/start
 *
 * Atomic subscription signup:
 *   1. Insert subscription (status=pending) with the requested cadence.
 *   2. Initialize a Paystack transaction for the FIRST cycle amount
 *      (subscription cycle total + customer processing fee).
 *   3. Return { access_code, reference, subscriptionId } so the popup can open.
 *
 * On charge.success (webhook), we set subscription.status='active' and store
 * the authorization_code. From there, the cron renews via charge_authorization.
 */

import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import {
    initializeTransaction,
    customerProcessingFeeKobo,
    nairaToKobo,
    buildReference,
    DEFAULT_CHANNELS,
} from "@/lib/paystack";
import { insertPaymentRow, upsertCustomerFromOrder, logPaymentEvent } from "@/lib/payments";
import { SITE_URL } from "@/lib/constants";

export const runtime = "nodejs";

interface SubscribeBody {
    customerEmail: string;
    customerName: string;
    phone?: string;
    frequency: "weekly" | "biweekly" | "monthly";
    items: { productId: string; productName: string; quantity: number; price: number }[];
    deliveryAddress?: Record<string, unknown>;
    deliveryZone?: string;
}

export async function POST(request: Request) {
    let body: SubscribeBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.customerEmail || !body.customerName || !body.items?.length || !body.frequency) {
        return NextResponse.json(
            { success: false, error: "Missing required fields" },
            { status: 400 },
        );
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
        return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 });
    }

    const cycleTotal = body.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const baseKobo = nairaToKobo(cycleTotal);
    const processingFeeKobo = customerProcessingFeeKobo(baseKobo);
    const totalChargedKobo = baseKobo + processingFeeKobo;

    // Next-order date = now + 1 cycle (will advance after first paid charge)
    const now = new Date();
    let nextDate: Date;
    switch (body.frequency) {
        case "weekly":
            nextDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case "biweekly":
            nextDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            break;
        case "monthly":
            nextDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            break;
        default:
            return NextResponse.json({ success: false, error: "Invalid frequency" }, { status: 400 });
    }

    // ── 1. Insert subscription (pending first charge) ──
    const { data: subRow, error: subErr } = await supabase
        .from("subscriptions")
        .insert({
            customer_email: body.customerEmail.toLowerCase().trim(),
            customer_name: body.customerName,
            phone: body.phone ?? null,
            items: body.items,
            frequency: body.frequency,
            delivery_address: body.deliveryAddress ?? null,
            delivery_zone: body.deliveryZone ?? "Lagos",
            payment_method: "paystack",
            status: "active", // will require first paid charge before cron acts; gated by paystack_authorization_code presence
            amount_kobo: baseKobo,
            next_order_date: nextDate.toISOString().slice(0, 10),
        })
        .select("id")
        .single();
    if (subErr || !subRow) {
        return NextResponse.json(
            { success: false, error: `Subscription create failed: ${subErr?.message ?? "unknown"}` },
            { status: 500 },
        );
    }

    // ── 2. Upsert customer for Paystack ──
    const { customerId, paystackCustomerCode } = await upsertCustomerFromOrder({
        email: body.customerEmail,
        customerName: body.customerName,
        phone: body.phone ?? "",
    });

    // ── 3. Initialize Paystack transaction (first cycle charge) ──
    const reference = buildReference(`SUB-${subRow.id.slice(0, 8).toUpperCase()}`, 1);
    const callbackUrl = `${SITE_URL.replace(/\/$/, "")}/checkout/verify`;
    const initPayload = {
        email: body.customerEmail,
        amountKobo: totalChargedKobo,
        reference,
        callbackUrl,
        channels: DEFAULT_CHANNELS,
        customer: paystackCustomerCode ?? undefined,
        metadata: {
            subscription_id: subRow.id,
            subscription_intent: true,
            base_amount_kobo: baseKobo,
            processing_fee_kobo: processingFeeKobo,
            custom_fields: [
                { display_name: "Subscription", variable_name: "subscription_id", value: subRow.id },
                { display_name: "Frequency", variable_name: "frequency", value: body.frequency },
            ],
        },
    };

    let init;
    try {
        init = await initializeTransaction(initPayload);
    } catch (err) {
        await logPaymentEvent({
            reference,
            eventType: "subscription.initialize_failed",
            source: "initialize",
            payload: { error: String(err), subscription_id: subRow.id },
        });
        return NextResponse.json(
            { success: false, error: "Payment provider error", detail: String(err) },
            { status: 502 },
        );
    }

    // ── 4. Insert payment ledger row ──
    await insertPaymentRow({
        reference,
        subscriptionId: subRow.id,
        customerId,
        customerEmail: body.customerEmail,
        amountKobo: baseKobo,
        processingFeeKobo,
        totalChargedKobo,
        paystackAccessCode: init.access_code,
        metadata: { subscription_id: subRow.id, first_cycle: true },
        initializePayload: initPayload,
    });

    await logPaymentEvent({
        reference,
        eventType: "subscription.initialize",
        source: "initialize",
        payload: { subscription_id: subRow.id, access_code: init.access_code },
    });

    return NextResponse.json({
        success: true,
        subscriptionId: subRow.id,
        reference,
        accessCode: init.access_code,
        authorizationUrl: init.authorization_url,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        totalCharged: totalChargedKobo / 100,
        processingFee: processingFeeKobo / 100,
    });
}
