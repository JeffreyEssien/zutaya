import { cache } from "react";
import { getSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase";
import type { Product, Category, Order, SiteSettings, Coupon, Profile, InventoryLog, Page, InventoryItem, BundleRule, Subscription, NewsletterSubscriber, NewsletterCampaign } from "@/types";

interface DbProduct {
    id: string;
    slug: string;
    name: string;
    description: string;
    price: number;
    category: string;
    brand: string;
    stock: number;
    images: string[];
    variants: Product["variants"]; // JSONB
    is_featured: boolean;
    is_new: boolean;
    inventory_item_id?: string;
    created_at: string;
    // Meat commerce fields
    category_id?: string;
    price_unit?: string;
    cut_type?: string | null;
    storage_type?: string;
    prep_options?: any[];
    min_weight_kg?: number | null;
    related_recipe_ids?: string[];
}

interface DbOrder {
    id: string;
    customer_name: string;
    email: string;
    phone: string;
    items: Order["items"];
    subtotal: number;
    shipping: number;
    total: number;
    status: Order["status"];
    shipping_address: Order["shippingAddress"];
    created_at: string;
    notes?: string;
    coupon_code?: string;
    discount_total?: number;
    payment_method?: string;
    sender_name?: string;
    payment_status?: string;
    paystack_reference?: string;
    processing_fee?: number;
    delivery_zone?: string;
    delivery_type?: string;
    delivery_discount?: { percent: number; label: string | null };
    delivery_fee?: number;
    packaging_fee?: number;
    prep_fee?: number;
    prep_instructions?: string;
    requested_delivery_date?: string;
    requested_delivery_slot?: string;
    subscription_id?: string;
}

function toProduct(row: DbProduct): Product {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        price: Number(row.price),
        category: row.category,
        brand: row.brand,
        stock: row.stock,
        images: row.images,
        variants: typeof row.variants === "string" ? JSON.parse(row.variants) : row.variants || [],
        isFeatured: row.is_featured,
        isNew: row.is_new,
        inventoryId: row.inventory_item_id,
        categoryId: row.category_id,
        priceUnit: row.price_unit as Product["priceUnit"],
        cutType: row.cut_type,
        storageType: (row.storage_type as Product["storageType"]) || "fresh",
        prepOptions: typeof row.prep_options === "string" ? JSON.parse(row.prep_options) : row.prep_options || [],
        minWeightKg: row.min_weight_kg,
        relatedRecipeIds: row.related_recipe_ids || [],
        imageCooked: (row as any).image_cooked || undefined,
        imageEvent: (row as any).image_event || undefined,
    };
}

function toOrder(row: DbOrder): Order {
    return {
        id: row.id,
        customerName: row.customer_name,
        email: row.email,
        phone: row.phone || "",
        items: typeof row.items === "string" ? JSON.parse(row.items) : row.items || [],
        subtotal: Number(row.subtotal),
        shipping: Number(row.shipping),
        total: Number(row.total),
        status: row.status,
        shippingAddress: row.shipping_address,
        createdAt: row.created_at,
        notes: row.notes,
        couponCode: row.coupon_code || undefined,
        discountTotal: row.discount_total ? Number(row.discount_total) : undefined,
        paymentMethod: (row.payment_method as Order["paymentMethod"]) || undefined,
        senderName: row.sender_name || undefined,
        paymentStatus: (row.payment_status as Order["paymentStatus"]) || undefined,
        paystackReference: row.paystack_reference || undefined,
        processingFee: row.processing_fee ? Number(row.processing_fee) : undefined,
        deliveryZone: row.delivery_zone || undefined,
        deliveryType: (row.delivery_type as Order["deliveryType"]) || undefined,
        deliveryDiscount: row.delivery_discount || undefined,
        deliveryFee: row.delivery_fee ? Number(row.delivery_fee) : undefined,
        packagingFee: row.packaging_fee ? Number(row.packaging_fee) : undefined,
        prepFee: row.prep_fee ? Number(row.prep_fee) : undefined,
        prepInstructions: row.prep_instructions || undefined,
        requestedDeliveryDate: row.requested_delivery_date || undefined,
        requestedDeliverySlot: (row.requested_delivery_slot as Order["requestedDeliverySlot"]) || undefined,
        subscriptionId: row.subscription_id || undefined,
    };
}

// ... existing getProducts ...

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);
    if (error) throw error;
}

export async function updateOrderNotes(id: string, notes: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase
        .from("orders")
        .update({ notes })
        .eq("id", id);
    if (error) throw error;
}

export async function getProducts(): Promise<Product[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    // Try with inventory join first, fall back to plain select
    let data: any[] | null = null;
    const { data: joined, error: joinErr } = await supabase
        .from("products")
        .select("*, inventory:inventory_items(stock)")
        .order("created_at", { ascending: false });

    if (joinErr) {
        // FK join failed (table may not exist) — fall back
        const { data: plain, error: plainErr } = await supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });
        if (plainErr) { console.error("getProducts error:", plainErr); return []; }
        data = plain;
    } else {
        data = joined;
    }

    return (data || []).map((row: any) => ({
        ...toProduct(row),
        stock: row.inventory?.stock ?? row.stock,
    }));
}

export async function getFeaturedProducts(): Promise<Product[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .limit(4);
    if (error) throw error;
    return (data as DbProduct[]).map(toProduct);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
    if (!ids.length) return [];
    const supabase = getSupabaseServiceClient() || getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("id", ids);
    if (error || !data) return [];
    return ids.map((id) => data.find((p: any) => p.id === id)).filter(Boolean).map((row: any) => toProduct(row));
}

export async function getNewProducts(): Promise<Product[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_new", true)
        .limit(4);
    if (error) throw error;
    return (data as DbProduct[]).map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
        .from("products")
        .select("*, inventory:inventory_items(stock)")
        .eq("slug", slug)
        .single();
    if (error) return null;
    const prod = toProduct(data as DbProduct);
    prod.stock = (data as any).inventory?.stock ?? prod.stock;
    return prod;
}

export async function getProductSlugs(): Promise<string[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from("products").select("slug");
    if (error) return [];
    return (data as { slug: string }[]).map((r) => r.slug);
}

export async function getCategories(): Promise<Category[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
    if (error) throw error;
    return data as Category[];
}

export async function createCategory(category: Omit<Category, "id">): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("categories").insert({
        name: category.name,
        slug: category.slug,
        image: category.image,
        description: category.description,
    });
    if (error) throw error;
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase
        .from("categories")
        .update(category)
        .eq("id", id);
    if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
}

export async function getOrders(): Promise<Order[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as DbOrder[]).map(toOrder);
}

/** Fetch only orders created after a given timestamp (for notifications polling) */
export async function getRecentOrders(since: string, limit = 10): Promise<Order[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return (data as DbOrder[]).map(toOrder);
}

/** Fetch orders with pending payment submissions */
export async function getPendingPaymentOrders(): Promise<Order[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "payment_submitted")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as DbOrder[]).map(toOrder);
}

/** Get total order count (lightweight) */
export async function getOrderCount(): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) return 0;
    const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
}

export async function getOrderById(id: string): Promise<Order | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
    if (error) return null;
    return toOrder(data as DbOrder);
}

/**
 * Atomic order creation. Stock deduction + order insert + coupon increment
 * all run in a single Postgres transaction via `create_order_atomic` RPC
 * (migration 025). If ANY step fails, the whole thing rolls back — no
 * leaked stock, no orphan order rows. Per-product FOR UPDATE row locks
 * also act as a natural queue: two orders for different products run in
 * parallel; two for the same product wait microseconds.
 */
export async function createOrder(order: Order): Promise<void> {
    const supabase = getSupabaseServiceClient() ?? getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const items = order.items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        variant_name: item.variant?.name ?? null,
        inventory_item_id: item.product.inventoryId ?? null,
    }));

    // Snapshot per-unit COST from inventory onto each line item at the moment of
    // sale, so profit/COGS analytics stays accurate even after costs change later.
    // Cost is only tracked on the linked inventory item; items without one get 0.
    const invIds = Array.from(
        new Set(order.items.map((i) => i.product.inventoryId).filter(Boolean)),
    ) as string[];
    const costByInv = new Map<string, number>();
    if (invIds.length > 0) {
        const { data: invRows } = await supabase
            .from("inventory_items")
            .select("id, cost_price")
            .in("id", invIds);
        for (const r of invRows ?? []) costByInv.set(r.id, Number(r.cost_price) || 0);
    }
    const enrichedItems = order.items.map((item) => ({
        ...item,
        costPrice: item.product.inventoryId ? (costByInv.get(item.product.inventoryId) ?? 0) : 0,
    }));

    const orderPayload = {
        id: order.id,
        customer_name: order.customerName,
        email: order.email,
        phone: order.phone,
        items: enrichedItems,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        status: order.status,
        shipping_address: order.shippingAddress,
        notes: order.notes ?? null,
        coupon_code: order.couponCode ?? null,
        discount_total: order.discountTotal ?? 0,
        payment_method: order.paymentMethod ?? null,
        sender_name: order.senderName ?? null,
        payment_status: order.paymentStatus ?? null,
        paystack_reference: order.paystackReference ?? null,
        processing_fee: order.processingFee ?? 0,
        delivery_zone: order.deliveryZone ?? null,
        delivery_type: order.deliveryType ?? null,
        delivery_discount: order.deliveryDiscount ?? null,
        delivery_fee: order.deliveryFee ?? 0,
        packaging_fee: order.packagingFee ?? 0,
        prep_fee: order.prepFee ?? 0,
        prep_instructions: order.prepInstructions ?? null,
        requested_delivery_date: order.requestedDeliveryDate ?? null,
        requested_delivery_slot: order.requestedDeliverySlot ?? null,
        subscription_id: order.subscriptionId ?? null,
        created_at: new Date().toISOString(),
    };

    const { error } = await supabase.rpc("create_order_atomic", {
        p_order: orderPayload,
        p_items: items,
    });
    if (error) {
        // Surface a clean message — strip Postgres prefix noise
        throw new Error(error.message.replace(/^.*?:\s*/, ""));
    }
}

/**
 * Atomically restore stock for every item in an order. Mirror of the
 * create path — runs as a single transaction so partial restores can't
 * happen. Best-effort: errors are returned, not thrown, so callers can
 * still proceed with order-status cleanup.
 */
export async function restoreStockForOrderAtomic(order: Order): Promise<{ restored: number; error?: string }> {
    const supabase = getSupabaseServiceClient() ?? getSupabaseClient();
    if (!supabase) return { restored: 0, error: "Database not available" };

    const items = order.items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        variant_name: item.variant?.name ?? null,
        inventory_item_id: item.product.inventoryId ?? null,
    }));

    const { data, error } = await supabase.rpc("restore_stock_for_order_atomic", { p_items: items });
    if (error) return { restored: 0, error: error.message };
    return { restored: (data as { restored?: number } | null)?.restored ?? 0 };
}

/**
 * Restore stock for an order that was created but never paid for.
 * Mirror of createOrder's deduction step. Best-effort per item — one
 * bad item won't block the rest.
 */
export async function restoreStockForOrder(order: Order): Promise<{ restored: number; errors: string[] }> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return { restored: 0, errors: ["Database not available"] };

    let restored = 0;
    const errors: string[] = [];

    for (const item of order.items) {
        try {
            if (item.variant) {
                const { error } = await supabase.rpc("restore_variant_stock", {
                    p_product_id: item.product.id,
                    p_variant_name: item.variant.name,
                    p_quantity: item.quantity,
                });
                if (error) {
                    errors.push(`${item.product.name} [${item.variant.name}]: ${error.message}`);
                    continue;
                }
                await supabase.from("inventory_logs").insert({
                    product_id: item.product.id,
                    change_amount: item.quantity,
                    reason: `restore_variant_${item.variant.name}_payment_failed`,
                });
                restored++;
            } else if (item.product.inventoryId) {
                const { error } = await supabase.rpc("restore_stock", {
                    p_inventory_id: item.product.inventoryId,
                    p_quantity: item.quantity,
                });
                if (error) {
                    errors.push(`${item.product.name}: ${error.message}`);
                    continue;
                }
                await supabase.from("inventory_logs").insert({
                    product_id: item.product.id,
                    change_amount: item.quantity,
                    reason: "restore_main_payment_failed",
                });
                restored++;
            }
        } catch (err) {
            errors.push(`${item.product.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return { restored, errors };
}

export async function updatePaymentInfo(
    orderId: string,
    updates: { senderName?: string; paymentStatus?: Order["paymentStatus"] }
): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const dbUpdates: any = {};
    if (updates.senderName !== undefined) dbUpdates.sender_name = updates.senderName;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;

    const { error } = await supabase
        .from("orders")
        .update(dbUpdates)
        .eq("id", orderId);
    if (error) throw error;
}

export interface CreateProductInput {
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    brand?: string;
    images: string[];
    variants: Product["variants"];
    inventoryId?: string;
    priceUnit?: string;
    cutType?: string | null;
    storageType?: string;
    prepOptions?: any[];
    minWeightKg?: number | null;
    imageCooked?: string;
    imageEvent?: string;
}

export async function createProduct(input: CreateProductInput): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Resolve category_id from category name
    let categoryId: string | undefined;
    if (input.category) {
        const { data: cat } = await supabase
            .from("categories")
            .select("id")
            .eq("name", input.category)
            .single();
        if (cat) categoryId = cat.id;
    }

    const insertData: any = {
        slug,
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        category_id: categoryId || null,
        brand: input.brand || "Zúta Ya",
        stock: input.stock,
        images: input.images,
        variants: input.variants,
        is_featured: false,
        is_new: true,
        inventory_item_id: input.inventoryId,
    };
    if (input.priceUnit) insertData.price_unit = input.priceUnit;
    if (input.cutType !== undefined) insertData.cut_type = input.cutType;
    if (input.storageType) insertData.storage_type = input.storageType;
    if (input.prepOptions) insertData.prep_options = input.prepOptions;
    if (input.minWeightKg !== undefined) insertData.min_weight_kg = input.minWeightKg;
    if (input.imageCooked !== undefined) insertData.image_cooked = input.imageCooked;
    if (input.imageEvent !== undefined) insertData.image_event = input.imageEvent;

    const { error } = await supabase.from("products").insert(insertData);
    if (error) throw error;
}
export async function updateProduct(id: string, input: CreateProductInput): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Resolve category_id from category name
    let categoryId: string | undefined;
    if (input.category) {
        const { data: cat } = await supabase
            .from("categories")
            .select("id")
            .eq("name", input.category)
            .single();
        if (cat) categoryId = cat.id;
    }

    const updateData: any = {
        slug,
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        category_id: categoryId || null,
        stock: input.stock,
        images: input.images,
        variants: input.variants,
    };
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.inventoryId !== undefined) updateData.inventory_item_id = input.inventoryId;
    if (input.priceUnit !== undefined) updateData.price_unit = input.priceUnit;
    if (input.cutType !== undefined) updateData.cut_type = input.cutType;
    if (input.storageType !== undefined) updateData.storage_type = input.storageType;
    if (input.prepOptions !== undefined) updateData.prep_options = input.prepOptions;
    if (input.minWeightKg !== undefined) updateData.min_weight_kg = input.minWeightKg;
    if (input.imageCooked !== undefined) updateData.image_cooked = input.imageCooked;
    if (input.imageEvent !== undefined) updateData.image_event = input.imageEvent;

    const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id);

    if (error) throw error;
}

export async function updateProductStock(id: string, newStock: number): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", id);

    if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    // Record a redirect for the product's URL so it keeps its SEO equity (301)
    // instead of 404-ing after deletion. Best-effort — never blocks the delete.
    try {
        const { data: prod } = await supabase
            .from("products")
            .select("slug, category")
            .eq("id", id)
            .single();
        if (prod?.slug) {
            const target = prod.category
                ? `/shop?category=${encodeURIComponent(prod.category as string)}`
                : "/shop";
            await supabase
                .from("product_redirects")
                .upsert({ old_slug: prod.slug, target_path: target }, { onConflict: "old_slug" });
        }
    } catch {
        // product_redirects table may not exist yet — ignore.
    }

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
}

/** Look up a 301 redirect target for a deleted product slug (null if none). */
export async function getProductRedirect(slug: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from("product_redirects")
            .select("target_path")
            .eq("old_slug", slug)
            .maybeSingle();
        if (error || !data) return null;
        return data.target_path as string;
    } catch {
        return null;
    }
}

export const getSiteSettings = cache(async (): Promise<SiteSettings | null> => _getSiteSettings());
async function _getSiteSettings(): Promise<SiteSettings | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // We expect a single row with id=true
    const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", true)
        .single();

    if (error) {
        // If table doesn't exist or is empty, return default/null
        return null;
    }

    return {
        id: data.id,
        siteName: data.site_name,
        logoUrl: data.logo_url,
        heroHeading: data.hero_heading,
        heroSubheading: data.hero_subheading,
        heroImage: data.hero_image,
        heroCtaText: data.hero_cta_text,
        heroCtaLink: data.hero_cta_link,
        faviconUrl: data.favicon_url,
        ourStoryHeading: data.our_story_heading,
        ourStoryText: data.our_story_text,
        whyZutaYaHeading: data.why_xelle_heading,
        whyZutaYaFeatures: data.why_xelle_features,
        // Announcement bar
        announcementBarEnabled: data.announcement_bar_enabled,
        announcementBarText: data.announcement_bar_text,
        announcementBarColor: data.announcement_bar_color,
        // Social links
        socialInstagram: data.social_instagram,
        socialTwitter: data.social_twitter,
        socialTiktok: data.social_tiktok,
        socialFacebook: data.social_facebook,
        // Business contact
        businessPhone: data.business_phone,
        businessWhatsapp: data.business_whatsapp,
        businessAddress: data.business_address,
        // About page
        aboutPromiseText: data.about_promise_text,
        aboutQuote: data.about_quote,
        aboutStats: data.about_stats,
        // Footer
        footerTagline: data.footer_tagline,
        // Shipping
        freeShippingThreshold: data.free_shipping_threshold != null ? Number(data.free_shipping_threshold) : undefined,
        // Packaging
        packagingFee: data.packaging_fee != null ? Number(data.packaging_fee) : 500,
        packagingLabel: data.packaging_label || "Premium Packaging",
        packagingDescription: data.packaging_description || "Insulated gift-ready packaging with ice packs for extended freshness",
        heroDisplayConfig: data.hero_display_config
            ? (typeof data.hero_display_config === "string" ? JSON.parse(data.hero_display_config) : data.hero_display_config)
            : { mode: "single", mediaIds: [], slideshowInterval: 5 },
        featuredSlides: data.featured_slides
            ? (typeof data.featured_slides === "string" ? JSON.parse(data.featured_slides) : data.featured_slides)
            : [],
        customTexts: data.custom_texts || {},
        deliveryCutoffHour: data.delivery_cutoff_hour ?? 12,
        deliveryCutoffLabel: data.delivery_cutoff_label || "Orders placed after 12:00 PM ship the next day",
        kitchenEnabled: data.kitchen_enabled ?? true,
        kitchenHeroImage: data.kitchen_hero_image || undefined,
        kitchenTagline: data.kitchen_tagline || "Fired up daily. Delivered hot.",
        kitchenLeadMinutes: data.kitchen_lead_minutes ?? 90,
        eventsEnabled: data.events_enabled ?? true,
        eventsTagline: data.events_tagline || "From slaughter to plate, on-site.",
        butcherProfiles: data.butcher_profiles
            ? (typeof data.butcher_profiles === "string" ? JSON.parse(data.butcher_profiles) : data.butcher_profiles)
            : [],
    };
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const dbSettings: any = {};
    if (settings.siteName !== undefined) dbSettings.site_name = settings.siteName;
    if (settings.logoUrl !== undefined) dbSettings.logo_url = settings.logoUrl;
    if (settings.heroHeading !== undefined) dbSettings.hero_heading = settings.heroHeading;
    if (settings.heroSubheading !== undefined) dbSettings.hero_subheading = settings.heroSubheading;
    if (settings.heroImage !== undefined) dbSettings.hero_image = settings.heroImage;
    if (settings.heroCtaText !== undefined) dbSettings.hero_cta_text = settings.heroCtaText;
    if (settings.heroCtaLink !== undefined) dbSettings.hero_cta_link = settings.heroCtaLink;
    if (settings.faviconUrl !== undefined) dbSettings.favicon_url = settings.faviconUrl;
    if (settings.ourStoryHeading !== undefined) dbSettings.our_story_heading = settings.ourStoryHeading;
    if (settings.ourStoryText !== undefined) dbSettings.our_story_text = settings.ourStoryText;
    if (settings.whyZutaYaHeading !== undefined) dbSettings.why_xelle_heading = settings.whyZutaYaHeading;
    if (settings.whyZutaYaFeatures !== undefined) dbSettings.why_xelle_features = settings.whyZutaYaFeatures;
    // Announcement bar
    if (settings.announcementBarEnabled !== undefined) dbSettings.announcement_bar_enabled = settings.announcementBarEnabled;
    if (settings.announcementBarText !== undefined) dbSettings.announcement_bar_text = settings.announcementBarText;
    if (settings.announcementBarColor !== undefined) dbSettings.announcement_bar_color = settings.announcementBarColor;
    // Social links
    if (settings.socialInstagram !== undefined) dbSettings.social_instagram = settings.socialInstagram;
    if (settings.socialTwitter !== undefined) dbSettings.social_twitter = settings.socialTwitter;
    if (settings.socialTiktok !== undefined) dbSettings.social_tiktok = settings.socialTiktok;
    if (settings.socialFacebook !== undefined) dbSettings.social_facebook = settings.socialFacebook;
    // Business contact
    if (settings.businessPhone !== undefined) dbSettings.business_phone = settings.businessPhone;
    if (settings.businessWhatsapp !== undefined) dbSettings.business_whatsapp = settings.businessWhatsapp;
    if (settings.businessAddress !== undefined) dbSettings.business_address = settings.businessAddress;
    // About page
    if (settings.aboutPromiseText !== undefined) dbSettings.about_promise_text = settings.aboutPromiseText;
    if (settings.aboutQuote !== undefined) dbSettings.about_quote = settings.aboutQuote;
    if (settings.aboutStats !== undefined) dbSettings.about_stats = settings.aboutStats;
    // Footer
    if (settings.footerTagline !== undefined) dbSettings.footer_tagline = settings.footerTagline;
    // Shipping
    if (settings.freeShippingThreshold !== undefined) dbSettings.free_shipping_threshold = settings.freeShippingThreshold;
    // Packaging
    if (settings.packagingFee !== undefined) dbSettings.packaging_fee = settings.packagingFee;
    if (settings.packagingLabel !== undefined) dbSettings.packaging_label = settings.packagingLabel;
    if (settings.packagingDescription !== undefined) dbSettings.packaging_description = settings.packagingDescription;
    if (settings.heroDisplayConfig !== undefined) dbSettings.hero_display_config = settings.heroDisplayConfig;
    if (settings.featuredSlides !== undefined) dbSettings.featured_slides = settings.featuredSlides;
    if (settings.customTexts !== undefined) dbSettings.custom_texts = settings.customTexts;
    if (settings.deliveryCutoffHour !== undefined) dbSettings.delivery_cutoff_hour = settings.deliveryCutoffHour;
    if (settings.deliveryCutoffLabel !== undefined) dbSettings.delivery_cutoff_label = settings.deliveryCutoffLabel;
    if (settings.kitchenEnabled !== undefined) dbSettings.kitchen_enabled = settings.kitchenEnabled;
    if (settings.kitchenHeroImage !== undefined) dbSettings.kitchen_hero_image = settings.kitchenHeroImage;
    if (settings.kitchenTagline !== undefined) dbSettings.kitchen_tagline = settings.kitchenTagline;
    if (settings.kitchenLeadMinutes !== undefined) dbSettings.kitchen_lead_minutes = settings.kitchenLeadMinutes;
    if (settings.eventsEnabled !== undefined) dbSettings.events_enabled = settings.eventsEnabled;
    if (settings.eventsTagline !== undefined) dbSettings.events_tagline = settings.eventsTagline;
    if (settings.butcherProfiles !== undefined) dbSettings.butcher_profiles = settings.butcherProfiles;

    // init if not exists, otherwise update
    const { error } = await supabase
        .from("site_settings")
        .upsert({ id: true, ...dbSettings });

    if (error) throw error;
}

/* ── Coupons ── */

export async function getCoupons(): Promise<Coupon[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching coupons:", error);
        return [];
    }

    return data.map((c) => ({
        id: c.id,
        code: c.code,
        discountPercent: c.discount_percent,
        isActive: c.is_active,
        usageCount: c.usage_count,
        createdAt: c.created_at,
    }));
}

export async function createCoupon(coupon: { code: string; discountPercent: number; isActive: boolean }): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("coupons").insert({
        code: coupon.code.toUpperCase(),
        discount_percent: coupon.discountPercent,
        is_active: coupon.isActive,
    });
    if (error) throw error;
}

export async function deleteCoupon(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) throw error;
}

export async function toggleCouponStatus(id: string, isActive: boolean): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("coupons").update({ is_active: isActive }).eq("id", id);
    if (error) throw error;
}

export async function validateCoupon(code: string): Promise<Coupon | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code.toUpperCase())
        .eq("is_active", true)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        code: data.code,
        discountPercent: data.discount_percent,
        isActive: data.is_active,
        usageCount: data.usage_count,
        createdAt: data.created_at,
    };
}

/* ── Customers ── */

export async function getCustomers(): Promise<Profile[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching customers:", JSON.stringify(error, null, 2));
        return [];
    }

    return data.map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        role: p.role,
        createdAt: p.created_at,
    }));
}

/* ── Inventory Logs ── */

export async function getInventoryLogs(): Promise<InventoryLog[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("inventory_logs")
        .select("*, product:products(name)")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching inventory logs:", JSON.stringify(error, null, 2));
        return [];
    }

    return data.map((log: any) => ({
        id: log.id,
        productId: log.product_id,
        productName: log.product?.name || "Unknown Product",
        changeAmount: log.change_amount,
        reason: log.reason,
        createdAt: log.created_at,
    }));
}

export async function logInventoryChange(productId: string, changeAmount: number, reason: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await supabase.from("inventory_logs").insert({
        product_id: productId,
        change_amount: changeAmount,
        reason,
    });
}

/* ── Inventory Items (New) ── */

export async function getInventoryItems(): Promise<InventoryItem[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

    if (error) {
        console.error("Error fetching inventory items:", error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        costPrice: Number(item.cost_price),
        sellingPrice: Number(item.selling_price),
        stock: item.stock,
        reorderLevel: item.reorder_level,
        supplier: item.supplier,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    }));
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
    if (updates.supplier !== undefined) dbUpdates.supplier = updates.supplier;

    const { error } = await supabase
        .from("inventory_items")
        .update(dbUpdates)
        .eq("id", id);
    if (error) throw error;
}

export async function createInventoryItem(item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase.from("inventory_items").insert({
        sku: item.sku,
        name: item.name,
        cost_price: item.costPrice,
        selling_price: item.sellingPrice,
        stock: item.stock,
        reorder_level: item.reorderLevel,
        supplier: item.supplier,
    }).select("id").single();

    if (error) throw error;
    return data.id;
}

/* ── CMS / Pages ── */

export async function getPages(): Promise<Page[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return [];

    return data.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        content: p.content,
        isPublished: p.is_published,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
    }));
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        content: data.content,
        isPublished: data.is_published,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function getPageById(id: string): Promise<Page | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        content: data.content,
        isPublished: data.is_published,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function createPage(page: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase.from("pages").insert({
        slug: page.slug,
        title: page.title,
        content: page.content,
        is_published: page.isPublished,
    }).select("id").single();

    if (error) throw error;
    return data.id;
}

export async function updatePage(id: string, page: Partial<Page>): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const updates: any = { updated_at: new Date().toISOString() };
    if (page.slug !== undefined) updates.slug = page.slug;
    if (page.title !== undefined) updates.title = page.title;
    if (page.content !== undefined) updates.content = page.content;
    if (page.isPublished !== undefined) updates.is_published = page.isPublished;

    const { error } = await supabase.from("pages").update(updates).eq("id", id);
    if (error) throw error;
}

export async function deletePage(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) throw error;
}

/* ── Delivery Zones & Locations ── */

export interface DbDeliveryZone {
    id: string;
    name: string;
    zone_type: "lagos";
    base_fee: number | null;
    allows_hub_pickup: boolean;
    hub_estimate: string | null;
    doorstep_estimate: string | null;
    discount_percent: number;
    discount_label: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface DbDeliveryLocation {
    id: string;
    zone_id: string;
    name: string;
    hub_pickup_fee: number | null;
    doorstep_fee: number | null;
    is_active: boolean;
    created_at: string;
}

export interface DeliveryZoneWithLocations extends DbDeliveryZone {
    locations: DbDeliveryLocation[];
}

export async function getDeliveryZones(): Promise<DeliveryZoneWithLocations[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data: zones, error: zErr } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("sort_order", { ascending: true });
    if (zErr) { console.error("Error fetching delivery zones:", zErr); return []; }

    const { data: locations, error: lErr } = await supabase
        .from("delivery_locations")
        .select("*")
        .order("name", { ascending: true });
    if (lErr) { console.error("Error fetching delivery locations:", lErr); return []; }

    return (zones as DbDeliveryZone[]).map((z) => ({
        ...z,
        base_fee: z.base_fee != null ? Number(z.base_fee) : null,
        discount_percent: Number(z.discount_percent),
        locations: (locations as DbDeliveryLocation[])
            .filter((l) => l.zone_id === z.id)
            .map((l) => ({
                ...l,
                hub_pickup_fee: l.hub_pickup_fee != null ? Number(l.hub_pickup_fee) : null,
                doorstep_fee: l.doorstep_fee != null ? Number(l.doorstep_fee) : null,
            })),
    }));
}

/** Customer-facing: only active zones + active locations */
export async function getActiveDeliveryPricing(): Promise<DeliveryZoneWithLocations[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data: zones, error: zErr } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
    if (zErr) return [];

    const { data: locations, error: lErr } = await supabase
        .from("delivery_locations")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
    if (lErr) return [];

    return (zones as DbDeliveryZone[]).map((z) => ({
        ...z,
        base_fee: z.base_fee != null ? Number(z.base_fee) : null,
        discount_percent: Number(z.discount_percent),
        locations: (locations as DbDeliveryLocation[])
            .filter((l) => l.zone_id === z.id)
            .map((l) => ({
                ...l,
                hub_pickup_fee: l.hub_pickup_fee != null ? Number(l.hub_pickup_fee) : null,
                doorstep_fee: l.doorstep_fee != null ? Number(l.doorstep_fee) : null,
            })),
    }));
}

export async function createDeliveryZone(zone: {
    name: string;
    zoneType: "lagos";
    baseFee?: number;
    allowsHubPickup?: boolean;
    hubEstimate?: string;
    doorstepEstimate?: string;
    discountPercent?: number;
    discountLabel?: string;
    sortOrder?: number;
}): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase.from("delivery_zones").insert({
        name: zone.name,
        zone_type: zone.zoneType,
        base_fee: zone.baseFee ?? null,
        allows_hub_pickup: zone.allowsHubPickup ?? false,
        hub_estimate: zone.hubEstimate ?? null,
        doorstep_estimate: zone.doorstepEstimate ?? null,
        discount_percent: zone.discountPercent ?? 0,
        discount_label: zone.discountLabel ?? null,
        sort_order: zone.sortOrder ?? 0,
    }).select("id").single();
    if (error) throw error;
    return data.id;
}

export async function updateDeliveryZone(id: string, updates: {
    name?: string;
    baseFee?: number | null;
    allowsHubPickup?: boolean;
    hubEstimate?: string | null;
    doorstepEstimate?: string | null;
    discountPercent?: number;
    discountLabel?: string | null;
    isActive?: boolean;
    sortOrder?: number;
}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.baseFee !== undefined) db.base_fee = updates.baseFee;
    if (updates.allowsHubPickup !== undefined) db.allows_hub_pickup = updates.allowsHubPickup;
    if (updates.hubEstimate !== undefined) db.hub_estimate = updates.hubEstimate;
    if (updates.doorstepEstimate !== undefined) db.doorstep_estimate = updates.doorstepEstimate;
    if (updates.discountPercent !== undefined) db.discount_percent = updates.discountPercent;
    if (updates.discountLabel !== undefined) db.discount_label = updates.discountLabel;
    if (updates.isActive !== undefined) db.is_active = updates.isActive;
    if (updates.sortOrder !== undefined) db.sort_order = updates.sortOrder;

    const { error } = await supabase.from("delivery_zones").update(db).eq("id", id);
    if (error) throw error;
}

export async function deleteDeliveryZone(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) throw error;
}

export async function createDeliveryLocation(loc: {
    zoneId: string;
    name: string;
    hubPickupFee?: number | null;
    doorstepFee?: number | null;
}): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase.from("delivery_locations").insert({
        zone_id: loc.zoneId,
        name: loc.name,
        hub_pickup_fee: loc.hubPickupFee ?? null,
        doorstep_fee: loc.doorstepFee ?? null,
    }).select("id").single();
    if (error) throw error;
    return data.id;
}

export async function updateDeliveryLocation(id: string, updates: {
    name?: string;
    hubPickupFee?: number | null;
    doorstepFee?: number | null;
    isActive?: boolean;
}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.hubPickupFee !== undefined) db.hub_pickup_fee = updates.hubPickupFee;
    if (updates.doorstepFee !== undefined) db.doorstep_fee = updates.doorstepFee;
    if (updates.isActive !== undefined) db.is_active = updates.isActive;

    const { error } = await supabase.from("delivery_locations").update(db).eq("id", id);
    if (error) throw error;
}

export async function deleteDeliveryLocation(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");
    const { error } = await supabase.from("delivery_locations").delete().eq("id", id);
    if (error) throw error;
}

// ═══════════════════════════════════════
// Bundle Rules Queries
// ═══════════════════════════════════════

function toBundleRule(row: any): BundleRule {
    return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        minItems: row.min_items,
        maxItems: row.max_items,
        discountPercent: Number(row.discount_percent),
        allowedCategoryIds: row.allowed_category_ids || undefined,
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}

export async function getBundleRules(activeOnly = false): Promise<BundleRule[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from("bundle_rules").select("*").order("created_at", { ascending: false });
    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(toBundleRule);
}

export async function getBundleRuleById(id: string): Promise<BundleRule | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.from("bundle_rules").select("*").eq("id", id).single();
    if (error || !data) return null;
    return toBundleRule(data);
}

export async function createBundleRule(input: {
    name: string;
    description?: string;
    minItems: number;
    maxItems: number;
    discountPercent: number;
    allowedCategoryIds?: string[];
    isActive?: boolean;
}): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase.from("bundle_rules").insert({
        name: input.name,
        description: input.description || null,
        min_items: input.minItems,
        max_items: input.maxItems,
        discount_percent: input.discountPercent,
        allowed_category_ids: input.allowedCategoryIds || null,
        is_active: input.isActive ?? true,
    }).select("id").single();

    if (error) throw error;
    return data.id;
}

export async function updateBundleRule(id: string, input: {
    name?: string;
    description?: string;
    minItems?: number;
    maxItems?: number;
    discountPercent?: number;
    allowedCategoryIds?: string[] | null;
    isActive?: boolean;
}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const db: any = {};
    if (input.name !== undefined) db.name = input.name;
    if (input.description !== undefined) db.description = input.description;
    if (input.minItems !== undefined) db.min_items = input.minItems;
    if (input.maxItems !== undefined) db.max_items = input.maxItems;
    if (input.discountPercent !== undefined) db.discount_percent = input.discountPercent;
    if (input.allowedCategoryIds !== undefined) db.allowed_category_ids = input.allowedCategoryIds;
    if (input.isActive !== undefined) db.is_active = input.isActive;

    const { error } = await supabase.from("bundle_rules").update(db).eq("id", id);
    if (error) throw error;
}

export async function deleteBundleRule(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("bundle_rules").delete().eq("id", id);
    if (error) throw error;
}

// ═══════════════════════════════════════
// Subscription Queries
// ═══════════════════════════════════════

function toSubscription(row: any): Subscription {
    return {
        id: row.id,
        customerEmail: row.customer_email,
        customerName: row.customer_name,
        phone: row.phone || undefined,
        items: row.items || [],
        frequency: row.frequency,
        deliveryAddress: row.delivery_address || undefined,
        deliveryZone: row.delivery_zone || undefined,
        paymentMethod: row.payment_method || undefined,
        status: row.status,
        nextOrderDate: row.next_order_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function getSubscriptions(): Promise<Subscription[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return [];
    return (data || []).map(toSubscription);
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.from("subscriptions").select("*").eq("id", id).single();
    if (error || !data) return null;
    return toSubscription(data);
}

export async function createSubscription(input: {
    customerEmail: string;
    customerName: string;
    phone?: string;
    items: Subscription["items"];
    frequency: Subscription["frequency"];
    deliveryAddress?: any;
    deliveryZone?: string;
    paymentMethod?: string;
    nextOrderDate: string;
}): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase.from("subscriptions").insert({
        customer_email: input.customerEmail,
        customer_name: input.customerName,
        phone: input.phone || null,
        items: input.items,
        frequency: input.frequency,
        delivery_address: input.deliveryAddress || null,
        delivery_zone: input.deliveryZone || null,
        payment_method: input.paymentMethod || null,
        next_order_date: input.nextOrderDate,
    }).select("id").single();

    if (error) throw error;
    return data.id;
}

export async function updateSubscription(id: string, input: {
    status?: Subscription["status"];
    frequency?: Subscription["frequency"];
    items?: Subscription["items"];
    nextOrderDate?: string;
}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const db: any = { updated_at: new Date().toISOString() };
    if (input.status !== undefined) db.status = input.status;
    if (input.frequency !== undefined) db.frequency = input.frequency;
    if (input.items !== undefined) db.items = input.items;
    if (input.nextOrderDate !== undefined) db.next_order_date = input.nextOrderDate;

    const { error } = await supabase.from("subscriptions").update(db).eq("id", id);
    if (error) throw error;
}

export async function getActiveSubscriptionsDueToday(): Promise<Subscription[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", "active")
        .eq("next_order_date", today);

    if (error) return [];
    return (data || []).map(toSubscription);
}

export async function advanceSubscriptionNextDate(id: string, frequency: Subscription["frequency"]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const now = new Date();
    if (frequency === "weekly") now.setDate(now.getDate() + 7);
    else if (frequency === "biweekly") now.setDate(now.getDate() + 14);
    else now.setMonth(now.getMonth() + 1);

    await supabase.from("subscriptions").update({
        next_order_date: now.toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
    }).eq("id", id);
}

export async function getOrdersOutForDelivery(): Promise<Order[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "out_for_delivery")
        .order("created_at", { ascending: false });

    if (error) return [];
    return (data || []).map(toOrder);
}

export async function getLowStockInventory(threshold?: number): Promise<InventoryItem[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const limit = threshold ?? 5;
    const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .lte("stock", limit)
        .order("stock", { ascending: true });

    if (error) return [];
    return (data || []).map((item: any) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        costPrice: Number(item.cost_price),
        sellingPrice: Number(item.selling_price),
        stock: item.stock,
        reorderLevel: item.reorder_level,
        supplier: item.supplier || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    }));
}

export async function getExpiringInventory(daysAhead = 7): Promise<{ id: string; name: string; stock: number; expiryDate: string }[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, stock, expiry_date")
        .not("expiry_date", "is", null)
        .lte("expiry_date", cutoff.toISOString().split("T")[0])
        .gt("stock", 0)
        .order("expiry_date", { ascending: true });

    if (error) return [];
    return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name || "Unknown",
        stock: item.stock,
        expiryDate: item.expiry_date,
    }));
}

export async function getCronLogs(limit = 50): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("cron_logs")
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}

export async function insertCronLog(log: { job_name: string; status: string; details?: string; items_processed?: number }): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await supabase.from("cron_logs").insert({
        job_name: log.job_name,
        status: log.status,
        details: log.details || null,
        items_processed: log.items_processed || 0,
        ran_at: new Date().toISOString(),
    });
}

// ═══════════════════════════════════════
// Newsletter Queries
// ═══════════════════════════════════════

function toNewsletterSubscriber(row: any): NewsletterSubscriber {
    return {
        id: row.id,
        email: row.email,
        firstName: row.first_name || undefined,
        source: row.source,
        token: row.token,
        subscribedAt: row.subscribed_at,
        unsubscribedAt: row.unsubscribed_at || null,
    };
}

function toNewsletterCampaign(row: any): NewsletterCampaign {
    return {
        id: row.id,
        subject: row.subject,
        content: row.content,
        status: row.status,
        sentAt: row.sent_at || null,
        recipientCount: row.recipient_count || 0,
        createdAt: row.created_at,
    };
}

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });

    if (error) return [];
    return (data || []).map(toNewsletterSubscriber);
}

export async function getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .is("unsubscribed_at", null)
        .order("subscribed_at", { ascending: false });

    if (error) return [];
    return (data || []).map(toNewsletterSubscriber);
}

export async function createNewsletterSubscriber(input: {
    email: string;
    firstName?: string;
    source?: string;
}): Promise<{ subscriber: NewsletterSubscriber | null; alreadyExists: boolean }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    // Check for existing subscriber
    const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .eq("email", input.email.toLowerCase())
        .maybeSingle();

    if (existing) {
        if (existing.unsubscribed_at) {
            await supabase
                .from("newsletter_subscribers")
                .update({ unsubscribed_at: null, subscribed_at: new Date().toISOString() })
                .eq("id", existing.id);
            return { subscriber: toNewsletterSubscriber({ ...existing, unsubscribed_at: null }), alreadyExists: false };
        }
        return { subscriber: toNewsletterSubscriber(existing), alreadyExists: true };
    }

    const token = crypto.randomUUID();
    const { data, error } = await supabase
        .from("newsletter_subscribers")
        .insert({
            email: input.email.toLowerCase(),
            first_name: input.firstName || null,
            source: input.source || "footer",
            token,
        })
        .select("*")
        .single();

    if (error) throw error;
    return { subscriber: toNewsletterSubscriber(data), alreadyExists: false };
}

export async function unsubscribeNewsletter(token: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { data, error } = await supabase
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("token", token)
        .is("unsubscribed_at", null)
        .select("id");

    if (error || !data?.length) return false;
    return true;
}

export async function deleteNewsletterSubscriber(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) throw error;
}

export async function getNewsletterCampaigns(): Promise<NewsletterCampaign[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return [];
    return (data || []).map(toNewsletterCampaign);
}

export async function createNewsletterCampaign(input: {
    subject: string;
    content: string;
}): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase.from("newsletter_campaigns").insert({
        subject: input.subject,
        content: input.content,
        status: "draft",
    }).select("id").single();

    if (error) throw error;
    return data.id;
}

export async function updateNewsletterCampaign(id: string, input: {
    subject?: string;
    content?: string;
    status?: NewsletterCampaign["status"];
    recipientCount?: number;
    sentAt?: string;
}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const db: any = {};
    if (input.subject !== undefined) db.subject = input.subject;
    if (input.content !== undefined) db.content = input.content;
    if (input.status !== undefined) db.status = input.status;
    if (input.recipientCount !== undefined) db.recipient_count = input.recipientCount;
    if (input.sentAt !== undefined) db.sent_at = input.sentAt;

    const { error } = await supabase.from("newsletter_campaigns").update(db).eq("id", id);
    if (error) throw error;
}

export async function deleteNewsletterCampaign(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("newsletter_campaigns").delete().eq("id", id);
    if (error) throw error;
}

/* ── Media ── */

export async function getMediaByIds(ids: string[]): Promise<{ id: string; url: string; type: string }[]> {
    if (!ids.length) return [];
    // Use service client — media table may not have anon RLS policy
    const supabase = getSupabaseServiceClient() || getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("media")
        .select("id, url, type")
        .in("id", ids);

    if (error || !data) return [];
    // Preserve order of ids
    return ids.map((id) => data.find((m) => m.id === id)).filter(Boolean) as { id: string; url: string; type: string }[];
}
