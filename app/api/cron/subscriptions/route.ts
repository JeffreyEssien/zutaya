import { NextResponse } from "next/server";
import {
    getActiveSubscriptionsDueToday,
    advanceSubscriptionNextDate,
    createOrder,
    insertCronLog,
} from "@/lib/queries";
import { sendSubscriptionRenewalEmail } from "@/lib/email";
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
            return NextResponse.json({ processed: 0, message: "No subscriptions due" });
        }

        let processed = 0;
        const errors: string[] = [];

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

                // Compute new next date for the email
                const nextDate = new Date();
                if (sub.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
                else if (sub.frequency === "biweekly") nextDate.setDate(nextDate.getDate() + 14);
                else nextDate.setMonth(nextDate.getMonth() + 1);

                await sendSubscriptionRenewalEmail(
                    sub.customerEmail,
                    sub.customerName,
                    orderId,
                    sub.items,
                    nextDate.toISOString()
                );

                processed++;
            } catch (err: any) {
                errors.push(`${sub.id}: ${err?.message || "unknown error"}`);
            }
        }

        await insertCronLog({
            job_name: "subscription_renewals",
            status: errors.length ? "error" : "success",
            details: errors.length ? errors.join("; ") : `${processed} subscriptions renewed`,
            items_processed: processed,
        });

        return NextResponse.json({ processed, errors: errors.length, total: subs.length });
    } catch (err: any) {
        await insertCronLog({ job_name: "subscription_renewals", status: "error", details: err?.message });
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
