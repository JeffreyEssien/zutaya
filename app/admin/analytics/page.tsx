import {
    getOrders,
    getProducts,
    getCustomers,
    getCoupons,
    getInventoryLogs,
    getInventoryItems
} from "@/lib/queries";
import { calculateAnalytics } from "@/lib/analytics";
import AnalyticsDashboard from "@/components/modules/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    try {
        const [orders, products, customers, coupons, inventoryLogs, inventoryItems] = await Promise.all([
            getOrders().catch(() => []),
            getProducts().catch(() => []),
            getCustomers().catch(() => []),
            getCoupons().catch(() => []),
            getInventoryLogs().catch(() => []),
            getInventoryItems().catch(() => []),
        ]);

        const data = calculateAnalytics(orders, products, customers, coupons, inventoryLogs, inventoryItems);

        return <AnalyticsDashboard data={data} />;
    } catch (err) {
        console.error("Analytics page error:", err);
        return (
            <div className="p-10 text-center">
                <h1 className="font-serif text-2xl text-brand-dark mb-2">Analytics Error</h1>
                <p className="text-brand-dark/50 text-sm">Failed to load analytics data. Ensure all database tables are set up.</p>
                <pre className="mt-4 text-xs text-red-500 bg-red-50 p-4 rounded-lg max-w-lg mx-auto text-left overflow-auto">
                    {String(err)}
                </pre>
            </div>
        );
    }
}
