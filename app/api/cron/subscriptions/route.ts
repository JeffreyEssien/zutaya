import { NextResponse } from "next/server";
import {
    getActiveSubscriptionsDueToday,
    advanceSubscriptionNextDate,
    createOrder,
    insertCronLog,
} from "@/lib/queries";
import { logCronEvent } from "@/lib/adminAuth";
import type { Order } from "@/types";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
    // Verify cron secret (Vercel passes this header)
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

        let processed = 0;
        const errors: string[] = [];
        const processedSummaries: string[] = [];

        for (const sub of subs) {
            try {
                const orderId = `SUB-${Date.now().toString(36).toUpperCase()}-${processed}`;
                const subTotal = sub.items.reduce((s, i) => s + i.price * i.quantity, 0);

                const order: Order = {
                    id: orderId,
                    customerName: sub.customerName,
                    email: sub.customerEmail,
                    phone: sub.phone || "",
                    items: sub.items.map((i) => ({
                        product: { id: i.productId, name: i.productName, slug: "", price: i.price, image: "", images: [], description: "", category: "", brand: "", stock: 0, variants: [], isFeatured: false, isNew: false },
                        quantity: i.quantity,
                    })) as any,
                    subtotal: subTotal,
                    shipping: 0,
                    total: subTotal,
                    status: "pending",
                    createdAt: new Date().toISOString(),
                    shippingAddress: sub.deliveryAddress || { firstName: sub.customerName, lastName: "", email: sub.customerEmail, phone: sub.phone || "", address: "", city: "", state: "Lagos", zip: "", country: "Nigeria" },
                    paymentMethod: (sub.paymentMethod as any) || "whatsapp",
                    deliveryZone: sub.deliveryZone,
                    deliveryType: "doorstep",
                };

                await createOrder(order);

                // Advance the next order date
                await advanceSubscriptionNextDate(sub.id, sub.frequency);

                const nextDate = new Date();
                if (sub.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
                else if (sub.frequency === "biweekly") nextDate.setDate(nextDate.getDate() + 14);
                else nextDate.setMonth(nextDate.getMonth() + 1);

                processedSummaries.push(
                    `${sub.id} → ${sub.customerName} (${sub.customerEmail}), order ${orderId}, next ${nextDate.toISOString().slice(0, 10)}`
                );
                processed++;
            } catch (err: any) {
                errors.push(`${sub.id}: ${err?.message || "unknown error"}`);
            }
        }

        const status = errors.length ? "error" : "success";
        const headline = `${processed}/${subs.length} subscriptions renewed`;
        const fullDetails = [
            headline,
            processedSummaries.length ? `Renewed: ${processedSummaries.join("; ")}` : "",
            errors.length ? `Errors: ${errors.join("; ")}` : "",
        ].filter(Boolean).join(" | ");

        await insertCronLog({
            job_name: "subscription_renewals",
            status,
            details: errors.length ? errors.join("; ") : headline,
            items_processed: processed,
        });
        await logCronEvent({
            jobName: "subscription_renewals",
            status,
            details: fullDetails,
        });

        return NextResponse.json({ processed, errors: errors.length, total: subs.length });
    } catch (err: any) {
        await insertCronLog({ job_name: "subscription_renewals", status: "error", details: err?.message });
        await logCronEvent({ jobName: "subscription_renewals", status: "error", details: err?.message || "unknown error" });
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
