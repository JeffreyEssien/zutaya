import { bumpaConfigStatus } from "@/lib/bumpa";
import { getBumpaOrders } from "@/lib/bumpaSync";
import { getProducts } from "@/lib/queries";
import BumpaSyncContent from "@/components/modules/BumpaSyncContent";

export const dynamic = "force-dynamic";

export default async function BumpaPage() {
    const [orders, products] = await Promise.all([
        getBumpaOrders().catch(() => []),
        getProducts().catch(() => []),
    ]);
    const config = bumpaConfigStatus();

    const productOptions = products.map((p) => ({
        id: p.id,
        name: p.name,
        variants: (Array.isArray(p.variants) ? p.variants : []).map((v) => v.name),
    }));

    return <BumpaSyncContent config={config} orders={orders} products={productOptions} />;
}
