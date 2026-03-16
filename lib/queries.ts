import { getSupabaseClient } from "@/lib/supabase";
import type { Product, Category, Order, SiteSettings, Coupon, Profile, InventoryLog, Page, InventoryItem } from "@/types";

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
    delivery_zone?: string;
    delivery_type?: string;
    delivery_discount?: { percent: number; label: string | null };
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
        variants: row.variants || [],
        isFeatured: row.is_featured,
        isNew: row.is_new,
        inventoryId: row.inventory_item_id,
    };
}

function toOrder(row: DbOrder): Order {
    return {
        id: row.id,
        customerName: row.customer_name,
        email: row.email,
        phone: row.phone || "",
        items: row.items,
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
        deliveryZone: row.delivery_zone || undefined,
        deliveryType: (row.delivery_type as Order["deliveryType"]) || undefined,
        deliveryDiscount: row.delivery_discount || undefined,
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
    const { data, error } = await supabase
        .from("products")
        .select("*, inventory:inventory_items(stock)")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as any[]).map(row => ({
        ...toProduct(row),
        stock: row.inventory?.stock ?? row.stock // Fallback to local stock if valid, but prefer inventory
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

export async function createOrder(order: Order): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    // Deduct stock atomically via RPC (prevents race conditions)
    for (const item of order.items) {
        if (item.variant) {
            // Deduct from variant stock inside the products JSONB array
            const { error: rpcError } = await supabase.rpc("deduct_variant_stock", {
                p_product_id: item.product.id,
                p_variant_name: item.variant.name,
                p_quantity: item.quantity,
            });

            if (rpcError) {
                throw new Error(rpcError.message || `Variant stock deduction failed for ${item.product.name} - ${item.variant.name}`);
            }

            // Log inventory change for the variant
            const { error: logError } = await supabase.from("inventory_logs").insert({
                product_id: item.product.id,
                change_amount: -item.quantity,
                reason: `order_variant_${item.variant.name}`
            });
            if (logError) console.warn("Inventory log failed (variant):", logError.message);

        } else if (item.product.inventoryId) {
            // Deduct from main inventory item stock (for non-variant products)
            const { error: rpcError } = await supabase.rpc("deduct_stock", {
                p_inventory_id: item.product.inventoryId,
                p_quantity: item.quantity,
            });

            if (rpcError) {
                throw new Error(rpcError.message || `Stock deduction failed for ${item.product.name}`);
            }

            // Log the inventory change (best-effort, ignore failures)
            const { error: logError } = await supabase.from("inventory_logs").insert({
                product_id: item.product.id,
                change_amount: -item.quantity,
                reason: 'order_main'
            });
            if (logError) console.warn("Inventory log failed:", logError.message);
        }
    }

    // Insert Order with proper coupon columns (no JSON hack)
    const insertData: any = {
        id: order.id,
        customer_name: order.customerName,
        email: order.email,
        phone: order.phone,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        status: order.status,
        shipping_address: order.shippingAddress,
        notes: order.notes || null,
        coupon_code: order.couponCode || null,
        discount_total: order.discountTotal || 0,
        created_at: new Date().toISOString()
    };

    // Add payment fields only if they have values (avoids errors if columns don't exist yet)
    if (order.paymentMethod) insertData.payment_method = order.paymentMethod;
    if (order.paymentStatus) insertData.payment_status = order.paymentStatus;
    if (order.senderName) insertData.sender_name = order.senderName;
    if (order.deliveryZone) insertData.delivery_zone = order.deliveryZone;
    if (order.deliveryType) insertData.delivery_type = order.deliveryType;
    if (order.deliveryDiscount) insertData.delivery_discount = order.deliveryDiscount;

    const { error } = await supabase.from("orders").insert(insertData);

    if (error) throw error;
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
    inventoryId?: string; // Link to inventory source
}

export async function createProduct(input: CreateProductInput): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const { error } = await supabase.from("products").insert({
        slug,
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        brand: input.brand || "XELLÉ",
        stock: input.stock,
        images: input.images,
        variants: input.variants,
        is_featured: false,
        is_new: true,
        inventory_item_id: input.inventoryId, // Save the link
    });
    if (error) throw error;
}
export async function updateProduct(id: string, input: CreateProductInput): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const updateData: any = {
        slug,
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        stock: input.stock,
        images: input.images,
        variants: input.variants,
    };
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.inventoryId !== undefined) updateData.inventory_item_id = input.inventoryId;

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

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
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
        whyXelleHeading: data.why_xelle_heading,
        whyXelleFeatures: data.why_xelle_features,
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
        // Footer
        footerTagline: data.footer_tagline,
        // Shipping
        freeShippingThreshold: data.free_shipping_threshold != null ? Number(data.free_shipping_threshold) : undefined,
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
    if (settings.whyXelleHeading !== undefined) dbSettings.why_xelle_heading = settings.whyXelleHeading;
    if (settings.whyXelleFeatures !== undefined) dbSettings.why_xelle_features = settings.whyXelleFeatures;
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
    // Footer
    if (settings.footerTagline !== undefined) dbSettings.footer_tagline = settings.footerTagline;
    // Shipping
    if (settings.freeShippingThreshold !== undefined) dbSettings.free_shipping_threshold = settings.freeShippingThreshold;

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
    zone_type: "lagos" | "interstate";
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
    zoneType: "lagos" | "interstate";
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
// Stockpile Queries
// ═══════════════════════════════════════

import type { Stockpile, StockpileItem } from "@/types";

function toStockpile(row: any, items: any[] = []): Stockpile {
    return {
        id: row.id,
        customerEmail: row.customer_email,
        customerName: row.customer_name,
        phone: row.phone || undefined,
        status: row.status,
        shippingAddress: row.shipping_address || undefined,
        deliveryZone: row.delivery_zone || undefined,
        deliveryType: row.delivery_type || undefined,
        deliveryFee: Number(row.delivery_fee || 0),
        totalItemsValue: Number(row.total_items_value || 0),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        shippedAt: row.shipped_at || undefined,
        items: items.map(toStockpileItem),
    };
}

function toStockpileItem(row: any): StockpileItem {
    return {
        id: row.id,
        stockpileId: row.stockpile_id,
        productId: row.product_id,
        productName: row.product_name,
        productImage: row.product_image || undefined,
        variantName: row.variant_name || undefined,
        quantity: row.quantity,
        pricePaid: Number(row.price_paid),
        orderId: row.order_id || undefined,
        createdAt: row.created_at,
    };
}

/** Get active stockpile for a customer by email */
export async function getStockpileByEmail(email: string): Promise<Stockpile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("stockpiles")
        .select("*")
        .eq("customer_email", email)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    // Fetch items
    const { data: items } = await supabase
        .from("stockpile_items")
        .select("*")
        .eq("stockpile_id", data.id)
        .order("created_at", { ascending: true });

    return toStockpile(data, items || []);
}

/** Get stockpile by ID */
export async function getStockpileById(id: string): Promise<Stockpile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("stockpiles")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) return null;

    const { data: items } = await supabase
        .from("stockpile_items")
        .select("*")
        .eq("stockpile_id", data.id)
        .order("created_at", { ascending: true });

    return toStockpile(data, items || []);
}

/** Create a new stockpile for a customer */
export async function createStockpile(input: {
    customerEmail: string;
    customerName: string;
    phone?: string;
}): Promise<Stockpile> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { data, error } = await supabase
        .from("stockpiles")
        .insert({
            customer_email: input.customerEmail,
            customer_name: input.customerName,
            phone: input.phone || null,
        })
        .select("*")
        .single();

    if (error) throw error;
    return toStockpile(data, []);
}

/** Add an item to a stockpile */
export async function addStockpileItem(input: {
    stockpileId: string;
    productId: string;
    productName: string;
    productImage?: string;
    variantName?: string;
    quantity: number;
    pricePaid: number;
    orderId?: string;
}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("stockpile_items").insert({
        stockpile_id: input.stockpileId,
        product_id: input.productId,
        product_name: input.productName,
        product_image: input.productImage || null,
        variant_name: input.variantName || null,
        quantity: input.quantity,
        price_paid: input.pricePaid,
        order_id: input.orderId || null,
    });

    if (error) throw error;

    // Update total value on stockpile
    await recalcStockpileTotal(input.stockpileId);
}

/** Remove item from stockpile */
export async function removeStockpileItem(itemId: string, stockpileId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase.from("stockpile_items").delete().eq("id", itemId);
    if (error) throw error;

    await recalcStockpileTotal(stockpileId);
}

/** Recalculate total items value for a stockpile */
async function recalcStockpileTotal(stockpileId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: items } = await supabase
        .from("stockpile_items")
        .select("price_paid, quantity")
        .eq("stockpile_id", stockpileId);

    const total = (items || []).reduce((sum, i) => sum + Number(i.price_paid) * i.quantity, 0);

    await supabase.from("stockpiles").update({ total_items_value: total }).eq("id", stockpileId);
}

/** Update stockpile status */
export async function updateStockpileStatus(
    id: string,
    status: Stockpile["status"]
): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const updateData: any = { status };
    if (status === "shipped") updateData.shipped_at = new Date().toISOString();

    const { error } = await supabase.from("stockpiles").update(updateData).eq("id", id);
    if (error) throw error;
}

/** Update stockpile shipping details (when customer is ready to ship) */
export async function updateStockpileShipping(
    id: string,
    shipping: {
        shippingAddress: any;
        deliveryZone?: string;
        deliveryType?: string;
        deliveryFee: number;
    }
): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Database not available");

    const { error } = await supabase
        .from("stockpiles")
        .update({
            shipping_address: shipping.shippingAddress,
            delivery_zone: shipping.deliveryZone || null,
            delivery_type: shipping.deliveryType || null,
            delivery_fee: shipping.deliveryFee,
        })
        .eq("id", id);

    if (error) throw error;
}

/** Get all stockpiles (admin) */
export async function getAllStockpiles(): Promise<Stockpile[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("stockpiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return [];

    // Fetch items for all stockpiles
    const ids = (data || []).map((s) => s.id);
    const { data: allItems } = await supabase
        .from("stockpile_items")
        .select("*")
        .in("stockpile_id", ids)
        .order("created_at", { ascending: true });

    return (data || []).map((s) =>
        toStockpile(s, (allItems || []).filter((i) => i.stockpile_id === s.id))
    );
}

/** Expire stockpiles older than 2 weeks */
export async function expireOldStockpiles(): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    const { data, error } = await supabase
        .from("stockpiles")
        .update({ status: "expired" })
        .eq("status", "active")
        .lt("expires_at", new Date().toISOString())
        .select("id");

    if (error) return 0;
    return data?.length || 0;
}
