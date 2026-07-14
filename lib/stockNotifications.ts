import { getSupabaseServiceClient } from "@/lib/supabase";
import { sendBackInStockEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/formatCurrency";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function unitSuffix(priceUnit?: string): string {
    switch (priceUnit) {
        case "per_kg": return " / kg";
        case "per_pack": return " / pack";
        case "per_piece": return " / piece";
        default: return "";
    }
}

/**
 * Subscribe an email to be notified when a product (optionally a specific
 * variant) is back in stock. Idempotent — a duplicate pending request for the
 * same product+variant+email is silently ignored (partial unique index).
 * Returns { ok, alreadySubscribed } or throws on hard failure.
 */
export async function subscribeStockNotification(input: {
    productId: string;
    email: string;
    variantName?: string | null;
}): Promise<{ ok: boolean; alreadySubscribed: boolean }> {
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Invalid email address");
    if (!input.productId) throw new Error("Missing product");

    const supabase = getSupabaseServiceClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("stock_notifications").insert({
        product_id: input.productId,
        variant_name: input.variantName || null,
        email,
    });

    // Duplicate pending request (unique index violation) → treat as success.
    if (error) {
        if (error.code === "23505") return { ok: true, alreadySubscribed: true };
        throw error;
    }
    return { ok: true, alreadySubscribed: false };
}

/**
 * Check whether a product (and/or its variants) is now in stock and email any
 * pending subscribers. Safe to call after ANY stock write — it only acts when
 * a pending subscription exists AND the item is available, then marks those
 * rows notified so they never fire twice. Best-effort; never throws.
 */
export async function notifyRestockIfAvailable(productId: string): Promise<void> {
    try {
        const supabase = getSupabaseServiceClient();
        if (!supabase) return;

        // Any pending subscribers for this product?
        const { data: pending } = await supabase
            .from("stock_notifications")
            .select("id, email, variant_name")
            .eq("product_id", productId)
            .is("notified_at", null);

        if (!pending || pending.length === 0) return;

        // Effective stock mirrors the storefront: inventory item stock overrides
        // product.stock; variants carry their own stock.
        const { data: product } = await supabase
            .from("products")
            .select("id, name, slug, price, price_unit, images, stock, variants, inventory:inventory_items(stock)")
            .eq("id", productId)
            .single();

        if (!product) return;

        const inv = (product as any).inventory;
        const invStock = Array.isArray(inv) ? inv[0]?.stock : inv?.stock;
        const baseStock = Number(invStock ?? product.stock) || 0;

        let variants: { name: string; stock?: number }[] = [];
        const rawV = (product as any).variants;
        if (Array.isArray(rawV)) variants = rawV;
        else if (typeof rawV === "string") { try { variants = JSON.parse(rawV) || []; } catch { variants = []; } }

        const variantStock = (name: string): number => {
            const v = variants.find(x => x.name === name);
            return v && v.stock != null ? Number(v.stock) : baseStock;
        };

        const firstImage = Array.isArray(product.images) ? product.images[0] : undefined;
        const priceLabel = product.price ? `${formatCurrency(Number(product.price))}${unitSuffix(product.price_unit)}` : undefined;

        const toNotify = pending.filter(p =>
            p.variant_name ? variantStock(p.variant_name) > 0 : baseStock > 0
        );
        if (toNotify.length === 0) return;

        for (const sub of toNotify) {
            await sendBackInStockEmail(
                sub.email,
                { name: product.name, slug: product.slug, image: firstImage, priceLabel },
                sub.variant_name
            );
        }

        await supabase
            .from("stock_notifications")
            .update({ notified_at: new Date().toISOString() })
            .in("id", toNotify.map(s => s.id));
    } catch (err) {
        console.error("notifyRestockIfAvailable failed:", err);
    }
}

export interface RestockDemand {
    productId: string;
    productName: string;
    count: number;
}

/**
 * How many customers are waiting on each still-pending product, most-wanted
 * first. Powers the admin "restock demand" panel. Never throws.
 */
export async function getStockNotificationDemand(): Promise<RestockDemand[]> {
    try {
        const supabase = getSupabaseServiceClient();
        if (!supabase) return [];
        const { data } = await supabase
            .from("stock_notifications")
            .select("product_id, product:products(name)")
            .is("notified_at", null);

        const map = new Map<string, RestockDemand>();
        for (const row of (data as any[]) || []) {
            const id = row.product_id as string;
            const name = row.product?.name || "Unknown product";
            const existing = map.get(id);
            if (existing) existing.count += 1;
            else map.set(id, { productId: id, productName: name, count: 1 });
        }
        return [...map.values()].sort((a, b) => b.count - a.count);
    } catch (err) {
        console.error("getStockNotificationDemand failed:", err);
        return [];
    }
}

/**
 * Restock came in via an inventory item — resolve the linked product(s) and
 * run the notifier for each. Best-effort; never throws.
 */
export async function notifyRestockForInventoryItem(inventoryItemId: string): Promise<void> {
    try {
        const supabase = getSupabaseServiceClient();
        if (!supabase) return;
        const { data } = await supabase
            .from("products")
            .select("id")
            .eq("inventory_item_id", inventoryItemId);
        for (const p of data || []) await notifyRestockIfAvailable(p.id);
    } catch (err) {
        console.error("notifyRestockForInventoryItem failed:", err);
    }
}
