import {
    getOrders,
    getProducts,
    getCustomers,
    getCoupons,
    getInventoryLogs,
    getInventoryItems,
    getSubscriptions,
} from "@/lib/queries";
import { getPaymentsForAnalytics } from "@/lib/payments";
import { calculateAnalytics } from "@/lib/analytics";
import AnalyticsDashboard from "@/components/modules/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    try {
        const [orders, products, customers, coupons, inventoryLogs, inventoryItems, subscriptions, payments] = await Promise.all([
            getOrders().catch(() => []),
            getProducts().catch(() => []),
            getCustomers().catch(() => []),
            getCoupons().catch(() => []),
            getInventoryLogs().catch(() => []),
            getInventoryItems().catch(() => []),
            getSubscriptions().catch(() => []),
            getPaymentsForAnalytics(90).catch(() => []),
        ]);

        const data = calculateAnalytics(orders, products, customers, coupons, inventoryLogs, inventoryItems, subscriptions, payments);

        return <AnalyticsDashboard data={data} />;
    } catch (err) {
        console.error("Analytics page error:", err);
        return (
            <div className="p-10 text-center">
                <h1 className="font-serif text-2xl text-warm-cream mb-2">Analytics Error</h1>
                <p className="text-warm-cream/50 text-sm">Failed to load analytics data. Ensure all database tables are set up.</p>
                <pre className="mt-4 text-xs text-red-500 bg-red-50 p-4 rounded-lg max-w-lg mx-auto text-left overflow-auto">
                    {String(err)}
                </pre>
            </div>
        );
    }
}
