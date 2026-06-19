/**
 * Subscription renewal cron — Paystack-powered.
 *
 *  For each subscription whose next_order_date <= today:
 *    1. If the subscription has a stored Paystack authorization_code,
 *       charge it via /transaction/charge_authorization for the
 *       gross-up amount (subtotal + processing fee).
 *    2. On success → create the renewal Order (paymentStatus=payment_confirmed)
 *       and advance next_order_date.
 *    3. On failure → bump failure_count, log error, do NOT advance date
 *       (we'll retry on the next cron tick). After 3 failures, pause it.
 *    4. If no authorization_code yet → leave alone (the first charge hasn't
 *       happened — they're a brand-new sub, the webhook will populate auth).
 */

import { NextResponse } from "next/server";
import {
    getActiveSubscriptionsDueToday,
    advanceSubscriptionNextDate,
    createOrder,
    insertCronLog,
} from "@/lib/queries";
import { logCronEvent } from "@/lib/adminAuth";
import { getSupabaseServiceClient } from "@/lib/supabase";
import {
    chargeAuthorization,
    customerProcessingFeeKobo,
    nairaToKobo,
    buildReference,
} from "@/lib/paystack";
import { insertPaymentRow, logPaymentEvent } from "@/lib/payments";
import type { Order } from "@/types";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
    if (CRON_SECRET) {
        const auth = request.headers.get("authorization");
        if (auth !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const subs = await getActiveSubscriptionsDueToday();

        if (subs.length === 0) {
            await insertCronLog({ job_name: "subscription_renewals", status: "skipped", details: "No subscriptions due today" });
            await logCronEvent({ jobName: "subscription_renewals", status: "skipped", details: "No subscriptions due today" });
            return NextResponse.json({ processed: 0, message: "No subscriptions due" });
        }

        const supabase = getSupabaseServiceClient();
        let processed = 0;
        let skipped = 0;
        const errors: string[] = [];
        const summaries: string[] = [];

        for (const sub of subs) {
            try {
                const dbSub = supabase
                    ? (await supabase.from("subscriptions").select("*").eq("id", sub.id).single()).data
                    : null;

                const authCode: string | null = dbSub?.paystack_authorization_code ?? null;

                // No saved authorization yet → can't auto-charge. Skip this tick.
                if (!authCode) {
                    skipped++;
                    summaries.push(`${sub.id} skipped (no auth code yet)`);
                    continue;
                }

                const subTotal = sub.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const baseKobo = nairaToKobo(subTotal);
                const processingFeeKobo = customerProcessingFeeKobo(baseKobo);
                const totalChargedKobo = baseKobo + processingFeeKobo;
                const processingFeeNaira = processingFeeKobo / 100;

                const orderId = `SUB-${Date.now().toString(36).toUpperCase()}-${processed}`;
                const reference = buildReference(orderId, 1);

                // Charge the saved authorization
                let charge;
                try {
                    charge = await chargeAuthorization({
                        authorizationCode: authCode,
                        email: sub.customerEmail,
                        amountKobo: totalChargedKobo,
                        reference,
                        metadata: { subscription_id: sub.id, order_id: orderId, renewal: true },
                    });
                } catch (err) {
                    // Bump failure_count, possibly pause
                    if (supabase) {
                        const failureCount = (dbSub?.failure_count ?? 0) + 1;
                        const updates: Record<string, unknown> = {
                            failure_count: failureCount,
                            last_charge_status: "failed",
                            last_charge_at: new Date().toISOString(),
                        };
                        if (failureCount >= 3) updates.status = "paused";
                        await supabase.from("subscriptions").update(updates).eq("id", sub.id);
                    }
                    errors.push(`${sub.id}: charge failed — ${err instanceof Error ? err.message : String(err)}`);
                    continue;
                }

                if (charge.status !== "success") {
                    errors.push(`${sub.id}: charge non-success — ${charge.gateway_response}`);
                    continue;
                }

                // Build & persist the renewal order (paid)
                const order: Order = {
                    id: orderId,
                    customerName: sub.customerName,
                    email: sub.customerEmail,
                    phone: sub.phone || "",
                    items: sub.items.map((i) => ({
                        product: { id: i.productId, name: i.productName, slug: "", price: i.price, images: [], description: "", category: "", brand: "", stock: 0, variants: [], isFeatured: false, isNew: false },
                        quantity: i.quantity,
                    })) as Order["items"],
                    subtotal: subTotal,
                    shipping: 0,
                    total: subTotal + processingFeeNaira,
                    status: "pending",
                    createdAt: new Date().toISOString(),
                    shippingAddress: sub.deliveryAddress ?? {
                        firstName: sub.customerName, lastName: "", email: sub.customerEmail,
                        phone: sub.phone || "", address: "", city: "", state: "Lagos", zip: "", country: "Nigeria",
                    },
                    paymentMethod: "paystack",
                    paymentStatus: "payment_confirmed",
                    paystackReference: reference,
                    processingFee: processingFeeNaira,
                    deliveryZone: sub.deliveryZone,
                    deliveryType: "doorstep",
                    subscriptionId: sub.id,
                };

                await createOrder(order);

                // Insert payment ledger row (status=paid immediately)
                await insertPaymentRow({
                    reference,
                    orderId,
                    subscriptionId: sub.id,
                    customerEmail: sub.customerEmail,
                    amountKobo: baseKobo,
                    processingFeeKobo,
                    totalChargedKobo,
                    metadata: { subscription_renewal: true },
                });
                if (supabase) {
                    await supabase
                        .from("payments")
                        .update({
                            status: "paid",
                            channel: charge.channel,
                            paystack_fees_kobo: charge.fees,
                            paystack_transaction_id: charge.id,
                            authorization_code: charge.authorization?.authorization_code ?? authCode,
                            paid_at: charge.paid_at || new Date().toISOString(),
                            verify_response: charge as unknown as Record<string, unknown>,
                        })
                        .eq("reference", reference);

                    await supabase.from("subscriptions").update({
                        last_charge_at: new Date().toISOString(),
                        last_charge_status: "success",
                        failure_count: 0,
                    }).eq("id", sub.id);
                }

                await advanceSubscriptionNextDate(sub.id, sub.frequency);
                await logPaymentEvent({
                    reference,
                    eventType: "subscription.renewed",
                    source: "cron",
                    payload: { subscription_id: sub.id, order_id: orderId, amount_kobo: totalChargedKobo },
                });

                summaries.push(`${sub.id} → ${orderId} (${charge.channel})`);
                processed++;
            } catch (err) {
                errors.push(`${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        const status = errors.length ? "error" : "success";
        const headline = `${processed}/${subs.length} renewed (skipped ${skipped}, errors ${errors.length})`;
        const fullDetails = [
            headline,
            summaries.length ? `Renewed: ${summaries.join("; ")}` : "",
            errors.length ? `Errors: ${errors.join("; ")}` : "",
        ].filter(Boolean).join(" | ");

        await insertCronLog({
            job_name: "subscription_renewals",
            status,
            details: errors.length ? errors.join("; ") : headline,
            items_processed: processed,
        });
        await logCronEvent({ jobName: "subscription_renewals", status, details: fullDetails });

        return NextResponse.json({ processed, skipped, errors: errors.length, total: subs.length });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        await insertCronLog({ job_name: "subscription_renewals", status: "error", details: msg });
        await logCronEvent({ jobName: "subscription_renewals", status: "error", details: msg });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
