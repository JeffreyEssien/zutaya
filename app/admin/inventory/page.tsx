import { getInventoryItems, getInventoryLogs, getOrders, getProducts } from "@/lib/queries";
import { getStockNotificationDemand } from "@/lib/stockNotifications";
import InventoryContent from "@/components/modules/InventoryContent";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
    const [inventory, logs, products, orders, restockDemand] = await Promise.all([
        getInventoryItems(),
        getInventoryLogs(),
        getProducts().catch(() => []),
        getOrders().catch(() => []),
        getStockNotificationDemand().catch(() => [])
    ]);

    return <InventoryContent inventory={inventory} logs={logs} products={products} orders={orders} restockDemand={restockDemand} />;
}
