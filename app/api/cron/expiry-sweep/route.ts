import { NextResponse } from "next/server";
import { getLowStockInventory, insertCronLog } from "@/lib/queries";
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
        const lowStock = await getLowStockInventory();

        if (lowStock.length === 0) {
            await insertCronLog({ job_name: "expiry_sweep", status: "skipped", details: "All inventory above threshold" });
            await logCronEvent({ jobName: "expiry_sweep", status: "skipped", details: "All inventory above threshold" });
            return NextResponse.json({ flagged: 0, message: "Inventory levels healthy" });
        }

        const outOfStock = lowStock.filter((i) => i.stock === 0).length;
        const summary = lowStock
            .map((i) => `${i.name} (SKU ${i.sku}): ${i.stock}/${i.reorderLevel}`)
            .join("; ");
        const headline = `${lowStock.length} items flagged (${outOfStock} out of stock)`;

        await insertCronLog({
            job_name: "expiry_sweep",
            status: "success",
            details: headline,
            items_processed: lowStock.length,
        });
        await logCronEvent({
            jobName: "expiry_sweep",
            status: "success",
            details: `${headline}: ${summary}`,
        });

        return NextResponse.json({ flagged: lowStock.length, outOfStock });
    } catch (err: any) {
        await insertCronLog({ job_name: "expiry_sweep", status: "error", details: err?.message });
        await logCronEvent({ jobName: "expiry_sweep", status: "error", details: err?.message || "unknown error" });
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
