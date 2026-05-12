import {
    getProducts,
    getOrders,
    getCustomers,
    getCoupons,
    getInventoryLogs,
    getInventoryItems
} from "@/lib/queries";
import { getServicesDashboardData } from "@/lib/servicesQueries";
import { calculateAnalytics } from "@/lib/analytics";
import AnalyticsDashboard from "@/components/modules/AnalyticsDashboard";
import ServicesDashboardCards from "@/components/modules/ServicesDashboardCards";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
    try {
        const [products, orders, customers, coupons, inventoryLogs, inventoryItems, services] = await Promise.all([
            getProducts().catch(() => []),
            getOrders().catch(() => []),
            getCustomers().catch(() => []),
            getCoupons().catch(() => []),
            getInventoryLogs().catch(() => []),
            getInventoryItems().catch(() => []),
            getServicesDashboardData().catch(() => ({ bookings: [], pendingBookings: 0, upcomingBookings: 0, activeMarinades: 0, activeProcessingOptions: 0 })),
        ]);

        const analyticsData = calculateAnalytics(orders, products, customers, coupons, inventoryLogs, inventoryItems);

        return (
            <div className="space-y-8">
                <ServicesDashboardCards
                    pendingBookings={services.pendingBookings}
                    upcomingBookings={services.upcomingBookings}
                    activeMarinades={services.activeMarinades}
                    activeProcessingOptions={services.activeProcessingOptions}
                    recentBookings={services.bookings}
                />
                <AnalyticsDashboard data={analyticsData} />
            </div>
        );
    } catch (err) {
        console.error("Admin dashboard error:", err);
        return (
            <div className="p-10 text-center">
                <h1 className="font-serif text-2xl text-warm-cream mb-2">Dashboard Error</h1>
                <p className="text-warm-cream/40 text-sm">Failed to load data. Ensure all database tables and migrations are up to date.</p>
                <pre className="mt-4 text-xs text-red-400 bg-red-500/10 p-4 rounded-lg max-w-lg mx-auto text-left overflow-auto border border-red-500/20">
                    {String(err)}
                </pre>
            </div>
        );
    }
}
