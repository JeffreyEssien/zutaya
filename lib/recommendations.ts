import { getSupabaseServiceClient } from "@/lib/supabase";

/**
 * Frequently-bought-together: product IDs most often purchased in the SAME
 * paid order as `productId`, most-frequent first. Scans a bounded window of
 * recent paid orders (cheap enough for this store's scale). Never throws.
 */
export async function getFrequentlyBoughtTogether(
    productId: string,
    limit = 3,
    orderWindow = 600,
): Promise<{ productId: string; count: number }[]> {
    try {
        const supabase = getSupabaseServiceClient();
        if (!supabase) return [];
        const { data } = await supabase
            .from("orders")
            .select("items")
            .eq("payment_status", "payment_confirmed")
            .order("created_at", { ascending: false })
            .limit(orderWindow);

        const counts = new Map<string, number>();
        for (const o of data || []) {
            const items = typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
            if (!Array.isArray(items)) continue;
            const ids = new Set<string>();
            for (const it of items) if (it?.product?.id) ids.add(it.product.id);
            if (!ids.has(productId)) continue;
            for (const id of ids) {
                if (id === productId) continue;
                counts.set(id, (counts.get(id) || 0) + 1);
            }
        }

        return [...counts.entries()]
            .map(([id, count]) => ({ productId: id, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    } catch (err) {
        console.error("getFrequentlyBoughtTogether failed:", err);
        return [];
    }
}
