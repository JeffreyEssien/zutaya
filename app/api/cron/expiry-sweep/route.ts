import { NextResponse } from "next/server";
import { getLowStockInventory, insertCronLog } from "@/lib/queries";
import { sendLowStockAlertEmail } from "@/lib/email";

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
            return NextResponse.json({ flagged: 0, message: "Inventory levels healthy" });
        }

        const alertItems = lowStock.map((i) => ({
            name: i.name,
            sku: i.sku,
            stock: i.stock,
            reorderLevel: i.reorderLevel,
        }));

        await sendLowStockAlertEmail(alertItems);

        await insertCronLog({
            job_name: "expiry_sweep",
            status: "success",
            details: `${lowStock.length} items flagged (${lowStock.filter(i => i.stock === 0).length} out of stock)`,
            items_processed: lowStock.length,
        });

        return NextResponse.json({ flagged: lowStock.length, outOfStock: lowStock.filter(i => i.stock === 0).length });
    } catch (err: any) {
        await insertCronLog({ job_name: "expiry_sweep", status: "error", details: err?.message });
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
