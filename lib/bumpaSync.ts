// Bumpa → zutaya sync engine.
//
// Pulls Bumpa orders, maps each line to a zutaya product (SKU → name → manual
// map), and for PAID + fully-matched orders creates a native order via
// create_order_atomic (oversell-safe stock deduction). Everything is staged in
// `bumpa_orders`; unmatched orders wait in `pending_mapping` until an admin adds
// a mapping and re-syncs. Deduplicated by Bumpa order id.
//
// The pure functions (normalizeBumpaOrder / buildMatchContext / matchLine /
// buildImportedOrder) have no DB/network deps and are unit-tested.

import type { BumpaOrder, BumpaOrderItem } from "@/lib/bumpa";
import { fetchAllOrders, isBumpaConfigured, bumpaConfigStatus } from "@/lib/bumpa";
import { createOrder, getInventoryItems, getProducts } from "@/lib/queries";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { CartItem, InventoryItem, Order, Product } from "@/types";

// ── Normalized shapes ─────────────────────────────────────────────

export interface NormalizedLine {
    bumpaProductId: string;
    variationId: string | null;
    sku: string | null;
    name: string | null;
    options: string | null;
    quantity: number;
    price: number;
    total: number;
}

export interface NormalizedOrder {
    bumpaOrderId: string;
    uniqueHash: string | null;
    paymentStatus: string; // upper-cased, e.g. "PAID"
    orderStatus: string | null;
    shippingStatus: string | null;
    channel: string | null;
    customerName: string;
    phone: string;
    email: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    currency: string;
    subtotal: number;
    shipping: number;
    total: number;
    orderDate: string | null;
    items: NormalizedLine[];
}

const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (v == null ? "" : String(v));
const lower = (v: string | null | undefined): string => (v || "").trim().toLowerCase();

/** Flatten a raw Bumpa order into the fields we care about. Pure. */
export function normalizeBumpaOrder(raw: BumpaOrder): NormalizedOrder {
    const cust = raw.customer_details || {};
    const ship = raw.shipping_details || {};
    const pick = (a: unknown, b: unknown): string => str(a || b);
    const items: NormalizedLine[] = (raw.order_items || []).map((it: BumpaOrderItem) => ({
        bumpaProductId: str(it.product_id),
        variationId: it.product_variation_id == null ? null : str(it.product_variation_id),
        sku: it.sku ? str(it.sku) : null,
        name: it.name ? str(it.name) : null,
        options: it.options ? str(it.options) : null,
        quantity: num(it.quantity),
        price: num(it.price),
        total: num(it.total),
    }));
    return {
        bumpaOrderId: str(raw.id),
        uniqueHash: raw.unique_hash ? str(raw.unique_hash) : null,
        paymentStatus: str(raw.payment_status).toUpperCase(),
        orderStatus: raw.status ? str(raw.status) : null,
        shippingStatus: raw.shipping_status ? str(raw.shipping_status) : null,
        channel: raw.channel ? str(raw.channel) : null,
        customerName: pick(cust.name, ship.name) || "Bumpa Customer",
        phone: pick(cust.phone, ship.phone),
        email: pick(cust.email, ship.email),
        street: pick(ship.street, cust.street),
        city: pick(ship.city, cust.city),
        state: pick(ship.state, cust.state),
        zip: pick(ship.zip, cust.zip),
        country: pick(ship.country, cust.country) || "Nigeria",
        currency: str(raw.currency_code) || "NGN",
        subtotal: num(raw.sub_total),
        shipping: num(raw.shipping_price),
        total: num(raw.grand_total ?? raw.total),
        orderDate: raw.order_date ? str(raw.order_date) : (raw.created_at ? str(raw.created_at) : null),
        items,
    };
}

// ── Matching ──────────────────────────────────────────────────────

export interface MapEntry {
    bumpaProductId: string;
    bumpaVariationId: string | null;
    productId: string;
    variantName: string | null;
}

export interface MatchContext {
    productById: Map<string, Product>;
    productByName: Map<string, Product>;
    productBySku: Map<string, Product>;
    mapByKey: Map<string, MapEntry>;
}

export interface LineMatch {
    product: Product;
    variantName: string | null;
}

const mapKey = (bumpaProductId: string, variationId: string | null): string =>
    `${bumpaProductId}:${variationId ?? ""}`;

/** Resolve a product's SKU via its linked inventory item (by id or by name). */
function skuForProduct(p: Product, invById: Map<string, InventoryItem>, invByName: Map<string, InventoryItem>): string | null {
    const linked = (p.inventoryId && invById.get(p.inventoryId)) || invByName.get(lower(p.name));
    return linked?.sku ? lower(linked.sku) : null;
}

/** Build lookup tables for matching. Pure. */
export function buildMatchContext(
    products: Product[],
    inventory: InventoryItem[],
    mapRows: MapEntry[],
): MatchContext {
    const invById = new Map<string, InventoryItem>();
    const invByName = new Map<string, InventoryItem>();
    for (const i of inventory) {
        invById.set(i.id, i);
        if (i.name) invByName.set(lower(i.name), i);
    }
    const productById = new Map<string, Product>();
    const productByName = new Map<string, Product>();
    const productBySku = new Map<string, Product>();
    for (const p of products) {
        productById.set(p.id, p);
        if (p.name) productByName.set(lower(p.name), p);
        const sku = skuForProduct(p, invById, invByName);
        if (sku) productBySku.set(sku, p);
    }
    const mapByKey = new Map<string, MapEntry>();
    for (const m of mapRows) {
        mapByKey.set(mapKey(m.bumpaProductId, m.bumpaVariationId), m);
    }
    return { productById, productByName, productBySku, mapByKey };
}

/** If the Bumpa options label names a real product variant, return its name. */
function variantFromOptions(product: Product, options: string | null): string | null {
    if (!options) return null;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const hit = variants.find((v) => lower(v.name) === lower(options));
    return hit ? hit.name : null;
}

/** Match one Bumpa line to a zutaya product. Manual map → SKU → name. Pure. */
export function matchLine(line: NormalizedLine, ctx: MatchContext): LineMatch | null {
    // 1. Manual map (exact variation, then any-variation fallback).
    const mapped =
        ctx.mapByKey.get(mapKey(line.bumpaProductId, line.variationId)) ??
        ctx.mapByKey.get(mapKey(line.bumpaProductId, null));
    if (mapped) {
        const product = ctx.productById.get(mapped.productId);
        if (product) {
            return { product, variantName: mapped.variantName ?? variantFromOptions(product, line.options) };
        }
    }
    // 2. SKU.
    if (line.sku) {
        const product = ctx.productBySku.get(lower(line.sku));
        if (product) return { product, variantName: variantFromOptions(product, line.options) };
    }
    // 3. Name.
    if (line.name) {
        const product = ctx.productByName.get(lower(line.name));
        if (product) return { product, variantName: variantFromOptions(product, line.options) };
    }
    return null;
}

// ── Build the native order for a fully-matched Bumpa order ─────────

/** Turn a normalized order + per-line matches into a zutaya Order. Pure. */
export function buildImportedOrder(order: NormalizedOrder, matches: LineMatch[]): Order {
    const [firstName, ...rest] = order.customerName.split(/\s+/);
    const items: CartItem[] = matches.map((m, idx) => ({
        product: m.product,
        quantity: order.items[idx].quantity,
        variant: m.variantName ? { name: m.variantName } : undefined,
    }));
    const channel = order.channel ? ` via ${order.channel}` : "";
    return {
        id: `BM-${order.bumpaOrderId}`,
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        items,
        subtotal: order.subtotal || order.total,
        shipping: order.shipping,
        total: order.total,
        status: "processing",
        createdAt: order.orderDate ? new Date(order.orderDate).toISOString() : new Date().toISOString(),
        shippingAddress: {
            firstName: firstName || order.customerName,
            lastName: rest.join(" "),
            email: order.email,
            phone: order.phone,
            address: order.street,
            city: order.city,
            state: order.state,
            zip: order.zip,
            country: order.country,
        },
        notes: `Imported from Bumpa (#${order.bumpaOrderId}${channel}).`,
        paymentStatus: "payment_confirmed",
        deliveryFee: order.shipping,
    };
}

// ── DB helpers (service role) ─────────────────────────────────────

export interface BumpaOrderRow {
    bumpaOrderId: string;
    paymentStatus: string | null;
    orderStatus: string | null;
    shippingStatus: string | null;
    customerName: string | null;
    total: number | null;
    grandTotal: number | null;
    orderDate: string | null;
    syncStatus: string;
    unmatched: { bumpaProductId: string; name: string | null; sku: string | null; options: string | null; quantity: number }[];
    importedOrderId: string | null;
    error: string | null;
    syncedAt: string;
}

export async function getBumpaProductMap(): Promise<MapEntry[]> {
    const sb = getSupabaseServiceClient();
    if (!sb) return [];
    const { data } = await sb
        .from("bumpa_product_map")
        .select("bumpa_product_id, bumpa_variation_id, product_id, variant_name");
    return (data ?? [])
        .filter((r) => r.product_id)
        .map((r) => ({
            bumpaProductId: String(r.bumpa_product_id),
            bumpaVariationId: r.bumpa_variation_id == null ? null : String(r.bumpa_variation_id),
            productId: String(r.product_id),
            variantName: r.variant_name ?? null,
        }));
}

export async function upsertBumpaProductMap(entry: {
    bumpaProductId: string;
    bumpaVariationId?: string | null;
    productId: string;
    variantName?: string | null;
    label?: string | null;
}): Promise<void> {
    const sb = getSupabaseServiceClient();
    if (!sb) throw new Error("Database not available");
    const { error } = await sb.from("bumpa_product_map").upsert(
        {
            bumpa_product_id: entry.bumpaProductId,
            bumpa_variation_id: entry.bumpaVariationId ?? null,
            product_id: entry.productId,
            variant_name: entry.variantName ?? null,
            label: entry.label ?? null,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "bumpa_product_id,bumpa_variation_id" },
    );
    if (error) throw new Error(error.message);
}

export async function getBumpaOrders(limit = 100): Promise<BumpaOrderRow[]> {
    const sb = getSupabaseServiceClient();
    if (!sb) return [];
    const { data } = await sb
        .from("bumpa_orders")
        .select(
            "bumpa_order_id, payment_status, order_status, shipping_status, customer_name, total, grand_total, order_date, sync_status, unmatched, imported_order_id, error, synced_at",
        )
        .order("synced_at", { ascending: false })
        .limit(limit);
    return (data ?? []).map((r) => ({
        bumpaOrderId: String(r.bumpa_order_id),
        paymentStatus: r.payment_status ?? null,
        orderStatus: r.order_status ?? null,
        shippingStatus: r.shipping_status ?? null,
        customerName: r.customer_name ?? null,
        total: r.total == null ? null : Number(r.total),
        grandTotal: r.grand_total == null ? null : Number(r.grand_total),
        orderDate: r.order_date ?? null,
        syncStatus: String(r.sync_status),
        unmatched: Array.isArray(r.unmatched) ? r.unmatched : [],
        importedOrderId: r.imported_order_id ?? null,
        error: r.error ?? null,
        syncedAt: String(r.synced_at),
    }));
}

// ── Orchestration ─────────────────────────────────────────────────

export interface SyncSummary {
    ok: boolean;
    error?: string;
    fetched: number;
    imported: number;
    pendingMapping: number;
    skipped: number;
    errors: number;
    alreadyImported: number;
}

export async function syncBumpaOrders(options: { onlyPaid?: boolean } = {}): Promise<SyncSummary> {
    const onlyPaid = options.onlyPaid ?? true;
    const empty: SyncSummary = {
        ok: false,
        fetched: 0,
        imported: 0,
        pendingMapping: 0,
        skipped: 0,
        errors: 0,
        alreadyImported: 0,
    };

    if (!isBumpaConfigured()) {
        return { ...empty, error: bumpaConfigStatus().blocker ?? "Bumpa is not configured." };
    }
    const sb = getSupabaseServiceClient();
    if (!sb) return { ...empty, error: "Database not available" };

    let rawOrders: BumpaOrder[];
    try {
        rawOrders = await fetchAllOrders();
    } catch (err) {
        return { ...empty, error: err instanceof Error ? err.message : String(err) };
    }

    const [products, inventory, mapRows] = await Promise.all([
        getProducts().catch(() => [] as Product[]),
        getInventoryItems().catch(() => [] as InventoryItem[]),
        getBumpaProductMap().catch(() => [] as MapEntry[]),
    ]);
    const ctx = buildMatchContext(products, inventory, mapRows);

    // Which Bumpa orders are already imported? (don't re-deduct)
    const { data: existing } = await sb
        .from("bumpa_orders")
        .select("bumpa_order_id, sync_status");
    const doneIds = new Set(
        (existing ?? []).filter((r) => r.sync_status === "imported").map((r) => String(r.bumpa_order_id)),
    );

    const summary: SyncSummary = { ...empty, ok: true, fetched: rawOrders.length };

    for (const raw of rawOrders) {
        const order = normalizeBumpaOrder(raw);
        if (doneIds.has(order.bumpaOrderId)) {
            summary.alreadyImported++;
            continue;
        }

        const matches = order.items.map((line) => ({ line, match: matchLine(line, ctx) }));
        const unmatched = matches
            .filter((m) => !m.match)
            .map((m) => ({
                bumpaProductId: m.line.bumpaProductId,
                name: m.line.name,
                sku: m.line.sku,
                options: m.line.options,
                quantity: m.line.quantity,
            }));

        let syncStatus = "pending_mapping";
        let importedOrderId: string | null = null;
        let errorMsg: string | null = null;

        if (onlyPaid && order.paymentStatus !== "PAID") {
            syncStatus = "skipped";
        } else if (unmatched.length > 0) {
            syncStatus = "pending_mapping";
            summary.pendingMapping++;
        } else if (order.items.length === 0) {
            syncStatus = "skipped";
        } else {
            // Fully matched + paid → create the native order (atomic deduction).
            const zOrder = buildImportedOrder(
                order,
                matches.map((m) => m.match as LineMatch),
            );
            try {
                await createOrder(zOrder);
                await sb
                    .from("orders")
                    .update({ source: "bumpa", bumpa_order_id: order.bumpaOrderId })
                    .eq("id", zOrder.id);
                syncStatus = "imported";
                importedOrderId = zOrder.id;
                doneIds.add(order.bumpaOrderId);
                summary.imported++;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (/duplicate key|already exists/i.test(msg)) {
                    // Order id / bumpa_order_id already present → treat as imported.
                    syncStatus = "imported";
                    importedOrderId = zOrder.id;
                    doneIds.add(order.bumpaOrderId);
                    summary.alreadyImported++;
                } else {
                    syncStatus = "error";
                    errorMsg = msg;
                    summary.errors++;
                }
            }
        }
        if (syncStatus === "skipped") summary.skipped++;

        await sb.from("bumpa_orders").upsert(
            {
                bumpa_order_id: order.bumpaOrderId,
                unique_hash: order.uniqueHash,
                payment_status: order.paymentStatus,
                order_status: order.orderStatus,
                shipping_status: order.shippingStatus,
                customer_name: order.customerName,
                customer_phone: order.phone,
                currency_code: order.currency,
                total: order.subtotal,
                grand_total: order.total,
                order_date: order.orderDate ? order.orderDate.slice(0, 10) : null,
                sync_status: syncStatus,
                unmatched,
                imported_order_id: importedOrderId,
                error: errorMsg,
                payload: raw as unknown as Record<string, unknown>,
                synced_at: new Date().toISOString(),
            },
            { onConflict: "bumpa_order_id" },
        );
    }

    return summary;
}
