import {
    getOrders,
    getCustomers,
    getInventoryItems,
    getProducts,
} from "@/lib/queries";
import { getServicesDashboardData } from "@/lib/servicesQueries";
import { getPaymentsForAnalytics, listDisputes } from "@/lib/payments";
import { calculateDashboard } from "@/lib/dashboard";
import DashboardHome from "@/components/modules/DashboardHome";
import ServicesDashboardCards from "@/components/modules/ServicesDashboardCards";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
    try {
        const [orders, customers, inventoryItems, products, services, payments, disputesRes] = await Promise.all([
            getOrders().catch(() => []),
            getCustomers().catch(() => []),
            getInventoryItems().catch(() => []),
            getProducts().catch(() => []),
            getServicesDashboardData().catch(() => ({ bookings: [], pendingBookings: 0, upcomingBookings: 0, activeMarinades: 0, activeProcessingOptions: 0 })),
            getPaymentsForAnalytics(30).catch(() => []),
            listDisputes({ status: "awaiting_evidence", limit: 100 }).catch(() => ({ disputes: [], total: 0 })),
        ]);

        const dashboard = calculateDashboard({
            orders,
            customers,
            inventoryItems,
            products,
            payments,
            disputes: disputesRes.disputes,
            pendingBookings: services.pendingBookings,
        });

        return (
            <div className="space-y-8">
                <DashboardHome data={dashboard} />
                <ServicesDashboardCards
                    pendingBookings={services.pendingBookings}
                    upcomingBookings={services.upcomingBookings}
                    activeMarinades={services.activeMarinades}
                    activeProcessingOptions={services.activeProcessingOptions}
                    recentBookings={services.bookings}
                />
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
