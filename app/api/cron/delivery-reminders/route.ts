import { NextResponse } from "next/server";
import { getOrdersOutForDelivery, insertCronLog } from "@/lib/queries";
import { sendDeliveryReminderEmail } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
    if (CRON_SECRET) {
        const auth = request.headers.get("authorization");
        if (auth !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const orders = await getOrdersOutForDelivery();

        if (orders.length === 0) {
            await insertCronLog({ job_name: "delivery_reminders", status: "skipped", details: "No orders out for delivery" });
            return NextResponse.json({ sent: 0, message: "No orders in transit" });
        }

        let sent = 0;
        for (const order of orders) {
            try {
                await sendDeliveryReminderEmail(order);
                sent++;
            } catch (err) {
                console.error(`Delivery reminder failed for ${order.id}:`, err);
            }
        }

        await insertCronLog({
            job_name: "delivery_reminders",
            status: "success",
            details: `${sent}/${orders.length} delivery reminder emails sent`,
            items_processed: sent,
        });

        return NextResponse.json({ sent, total: orders.length });
    } catch (err: any) {
        await insertCronLog({ job_name: "delivery_reminders", status: "error", details: err?.message });
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
