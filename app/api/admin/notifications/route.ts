import { NextResponse } from "next/server";
import { getRecentOrders, getPendingPaymentOrders, getOrderCount, getExpiringInventory, getLowStockInventory } from "@/lib/queries";

// This endpoint returns recent orders for the notification polling system.
// Uses DB-level filtering for efficiency instead of fetching all orders.
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const since = searchParams.get("since"); // ISO timestamp

        // Run queries in parallel — all use DB-level filtering
        const [recentOrders, pendingPayments, totalOrders, expiringStock, lowStock] = await Promise.all([
            since ? getRecentOrders(since, 10) : Promise.resolve([]),
            getPendingPaymentOrders(),
            getOrderCount(),
            getExpiringInventory(7),
            getLowStockInventory(5),
        ]);

        return NextResponse.json({
            recentOrders: recentOrders.map((o) => ({
                id: o.id,
                customerName: o.customerName,
                total: o.total,
                status: o.status,
                paymentMethod: o.paymentMethod,
                paymentStatus: o.paymentStatus,
                senderName: o.senderName,
                createdAt: o.createdAt,
            })),
            pendingPayments: pendingPayments.map((o) => ({
                id: o.id,
                customerName: o.customerName,
                total: o.total,
                senderName: o.senderName,
            })),
            totalOrders,
            expiringStock: expiringStock.map((i) => ({
                id: i.id,
                name: i.name,
                stock: i.stock,
                expiryDate: i.expiryDate,
            })),
            lowStock: lowStock.map((i) => ({
                id: i.id,
                name: i.name,
                stock: i.stock,
                reorderLevel: i.reorderLevel,
            })),
        });
    } catch (error) {
        console.error("Notifications API error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}
