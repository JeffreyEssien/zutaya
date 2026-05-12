import { NextResponse } from "next/server";
import { getOrdersOutForDelivery, insertCronLog } from "@/lib/queries";
import { logCronEvent } from "@/lib/adminAuth";

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
            await logCronEvent({ jobName: "delivery_reminders", status: "skipped", details: "No orders out for delivery" });
            return NextResponse.json({ tracked: 0, message: "No orders in transit" });
        }

        const summary = orders
            .map((o) => `${o.id} → ${o.customerName} (${o.email})`)
            .join("; ");

        await insertCronLog({
            job_name: "delivery_reminders",
            status: "success",
            details: `${orders.length} orders in transit (audit-logged, no email sent)`,
            items_processed: orders.length,
        });
        await logCronEvent({
            jobName: "delivery_reminders",
            status: "success",
            details: `${orders.length} orders out for delivery: ${summary}`,
        });

        return NextResponse.json({ tracked: orders.length });
    } catch (err: any) {
        await insertCronLog({ job_name: "delivery_reminders", status: "error", details: err?.message });
        await logCronEvent({ jobName: "delivery_reminders", status: "error", details: err?.message || "unknown error" });
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
