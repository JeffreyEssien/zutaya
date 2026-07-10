// Pure builders for the three inventory CSV export formats.
// Kept free of React/DOM so they are unit-testable.

import type { CsvCell } from "@/lib/csv";
import { arrayToCsv } from "@/lib/csv";
import type { InventoryItem, Order, Product, InventoryLog } from "@/types";

export type ExportFormat = "snapshot" | "sales" | "full" | "bumpa";

export interface ExportSection {
    headers: string[];
    rows: CsvCell[][];
}

const norm = (s: string | undefined | null): string => (s || "").trim().toLowerCase();
const round2 = (n: number): number => Math.round(n * 100) / 100;
const yesNo = (b: boolean): string => (b ? "Yes" : "No");

/** Index inventory items by normalised name and SKU for cheap lookup. */
function indexInventory(inventory: InventoryItem[]) {
    const byName = new Map<string, InventoryItem>();
    const bySku = new Map<string, InventoryItem>();
    for (const item of inventory) {
        if (item.name) byName.set(norm(item.name), item);
        if (item.sku) bySku.set(norm(item.sku), item);
    }
    return {
        match(product: Product): InventoryItem | undefined {
            return byName.get(norm(product.name)) || (product.inventoryId ? bySku.get(norm(product.inventoryId)) : undefined);
        },
        byName,
    };
}

/**
 * Format ①: current holdings, one row per item, grouped by category.
 * Spine = products (for category); enriched with inventory_items cost/supplier by name.
 * Inventory items with no matching product are appended as "Uncategorized".
 */
export function buildSnapshot(inventory: InventoryItem[], products: Product[]): ExportSection {
    const headers = [
        "Category", "Name", "SKU", "Storage", "Price Unit", "Stock", "Reorder Level",
        "Below Reorder", "Cost Price", "Selling Price", "Stock Value", "Potential Revenue",
        "Supplier", "Batch", "Expiry",
    ];
    const idx = indexInventory(inventory);
    const usedInventoryIds = new Set<string>();

    type Row = { category: string; name: string; cells: CsvCell[] };
    const rows: Row[] = [];

    for (const p of products) {
        const inv = idx.match(p);
        if (inv) usedInventoryIds.add(inv.id);
        const stock = inv ? inv.stock : p.stock;
        const cost = inv ? inv.costPrice : 0;
        const selling = inv ? inv.sellingPrice : p.price;
        const reorder = inv ? inv.reorderLevel : 0;
        rows.push({
            category: p.category || "Uncategorized",
            name: p.name,
            cells: [
                p.category || "Uncategorized", p.name, inv?.sku ?? "",
                p.storageType || inv?.storageType || "", p.priceUnit || "",
                stock, reorder, yesNo(stock <= reorder),
                round2(cost), round2(selling), round2(cost * stock), round2(selling * stock),
                inv?.supplier ?? "", inv?.batchNumber ?? "", inv?.expiryDate ?? "",
            ],
        });
    }

    // Standalone inventory items with no product match.
    for (const inv of inventory) {
        if (usedInventoryIds.has(inv.id)) continue;
        rows.push({
            category: "Uncategorized",
            name: inv.name,
            cells: [
                "Uncategorized", inv.name, inv.sku, inv.storageType || "", "",
                inv.stock, inv.reorderLevel, yesNo(inv.stock <= inv.reorderLevel),
                round2(inv.costPrice), round2(inv.sellingPrice),
                round2(inv.costPrice * inv.stock), round2(inv.sellingPrice * inv.stock),
                inv.supplier ?? "", inv.batchNumber ?? "", inv.expiryDate ?? "",
            ],
        });
    }

    rows.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    return { headers, rows: rows.map(r => r.cells) };
}

interface ProductStat {
    unitsSold: number;
    revenue: number;
    added: number;
    removed: number;
}

/** Aggregate paid-order line items and stock-log movements per product id. */
function aggregate(products: Product[], orders: Order[], logs: InventoryLog[]) {
    const stats = new Map<string, ProductStat>();
    const get = (id: string): ProductStat => {
        let s = stats.get(id);
        if (!s) { s = { unitsSold: 0, revenue: 0, added: 0, removed: 0 }; stats.set(id, s); }
        return s;
    };

    for (const order of orders) {
        if (order.paymentStatus !== "payment_confirmed") continue;
        for (const item of order.items) {
            const s = get(item.product.id);
            s.unitsSold += item.quantity;
            s.revenue += item.product.price * item.quantity;
        }
    }
    for (const log of logs) {
        if (!log.productId) continue;
        const s = get(log.productId);
        if (log.changeAmount >= 0) s.added += log.changeAmount;
        else s.removed += Math.abs(log.changeAmount);
    }
    return stats;
}

/**
 * Format ②: per-product current stock + movement history + sales revenue/profit.
 * Profit is an estimate — line-item cost is often 0, so cost falls back to the
 * matched inventory item's cost price (labelled "Est." in the headers).
 */
export function buildSalesMovement(
    products: Product[], orders: Order[], logs: InventoryLog[], inventory: InventoryItem[],
): ExportSection {
    const headers = [
        "Product", "Category", "Current Stock", "Stock Added", "Stock Removed",
        "Units Sold", "Revenue", "Est. Cost of Goods", "Est. Profit", "Margin %",
    ];
    const idx = indexInventory(inventory);
    const stats = aggregate(products, orders, logs);

    type Row = { revenue: number; cells: CsvCell[] };
    const rows: Row[] = products.map(p => {
        const s = stats.get(p.id) || { unitsSold: 0, revenue: 0, added: 0, removed: 0 };
        const inv = idx.match(p);
        const unitCost = inv ? inv.costPrice : 0;
        const cogs = unitCost * s.unitsSold;
        const profit = s.revenue - cogs;
        const margin = s.revenue > 0 ? round2((profit / s.revenue) * 100) : 0;
        return {
            revenue: s.revenue,
            cells: [
                p.name, p.category || "Uncategorized", p.stock, s.added, s.removed,
                s.unitsSold, round2(s.revenue), round2(cogs), round2(profit), margin,
            ],
        };
    });

    rows.sort((a, b) => b.revenue - a.revenue);
    return { headers, rows: rows.map(r => r.cells) };
}

/** Strip HTML tags and collapse whitespace to one clean line (Bumpa import safe). */
function plainText(html: string | undefined | null): string {
    return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Bumpa's product import schema — exact column order + spelling from Bumpa's own
// template (public/custom_import_template.csv). Rows are grouped by "Handle": a
// "Simple" parent row per product, followed by one "variant" row per variant.
const BUMPA_HEADERS = [
    "Handle", "Product Type", "Product Title", "Description (Long)",
    "Description (Short - max 300 characters)", "Cost price", "Selling Price",
    "Stock Qty", "Weight (kg)", "Collections", "SKU", "Barcode", "Featured Brand",
    "Option1 Type", "Option1 Value", "Option2 Type", "Option2 Value",
    "Option3 Type", "Option3 Value", "Main Image", "Additional Images",
];

/** Turn a category slug ("goat-meat") into a display collection ("Goat Meat"). */
function titleFromSlug(slug: string | undefined | null): string {
    return (slug || "")
        .split(/[-_]/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** Slug fragment for deriving per-variant SKUs (e.g. "1kg" → "1KG"). */
function skuFragment(name: string): string {
    return name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase();
}

/**
 * Bumpa bulk product upload — matches Bumpa's import template
 * (public/custom_import_template.csv) column-for-column so the file imports
 * without errors. Each product is a "Simple" parent row (grouped by Handle =
 * slug); variants follow as "variant" rows carrying their own price/stock/SKU
 * and Option1 = the variant name. Enriched with inventory_items (cost/SKU/live
 * stock) by name where matched.
 */
export function buildBumpaUpload(products: Product[], inventory: InventoryItem[]): ExportSection {
    const idx = indexInventory(inventory);
    const rows: CsvCell[][] = [];

    for (const p of products) {
        const inv = idx.match(p);
        const handle = p.slug || p.name;
        const sku = inv?.sku ?? "";
        const cost: CsvCell = inv ? round2(inv.costPrice) : "";
        const sellingBase = round2(inv ? inv.sellingPrice : p.price);
        const stockBase = inv ? inv.stock : p.stock;
        const weight: CsvCell = p.minWeightKg ?? "";
        const collection = titleFromSlug(p.category);
        const mainImage = p.images?.[0] ?? "";
        const additional = p.images && p.images.length > 1 ? p.images.slice(1).join(", ") : "";
        const variants = Array.isArray(p.variants) ? p.variants : [];

        // Parent "Simple" row — holds the product's title, description, brand,
        // collections and base price/stock (kept even when variants exist).
        rows.push([
            handle, "Simple", p.name, p.description || "", plainText(p.description).slice(0, 300),
            cost, sellingBase, stockBase, weight, collection, sku, "", p.brand || "",
            "", "", "", "", "", "", mainImage, additional,
        ]);

        // Variant rows — Option1 carries the variant name; own price/stock/SKU/image.
        for (const v of variants) {
            rows.push([
                handle, "variant", "", "", "",
                cost, round2(v.price ?? sellingBase), v.stock ?? 0, "", "",
                sku ? `${sku}-${skuFragment(v.name)}` : "", "", "",
                "Variant", v.name, "", "", "", "", v.image || "", "",
            ]);
        }
    }

    return { headers: BUMPA_HEADERS, rows };
}

/** Raw movement log — every inventory_logs row, newest first (input order preserved). */
export function buildMovementLog(logs: InventoryLog[]): ExportSection {
    return {
        headers: ["Date", "Product", "Change", "Reason"],
        rows: logs.map(l => [
            new Date(l.createdAt).toISOString(),
            l.productName || "Unknown Product",
            l.changeAmount,
            l.reason,
        ]),
    };
}

function summarySection(
    inventory: InventoryItem[], products: Product[], orders: Order[], logs: InventoryLog[],
): ExportSection {
    const stockValue = inventory.reduce((s, i) => s + i.costPrice * i.stock, 0);
    const potentialRevenue = inventory.reduce((s, i) => s + i.sellingPrice * i.stock, 0);
    const idx = indexInventory(inventory);
    const stats = aggregate(products, orders, logs);
    let salesRevenue = 0;
    let salesProfit = 0;
    for (const p of products) {
        const s = stats.get(p.id);
        if (!s) continue;
        const inv = idx.match(p);
        salesRevenue += s.revenue;
        salesProfit += s.revenue - (inv ? inv.costPrice : 0) * s.unitsSold;
    }
    return {
        headers: ["Metric", "Value"],
        rows: [
            ["Generated", new Date().toISOString()],
            ["Inventory Items", inventory.length],
            ["Products", products.length],
            ["Total Stock Value (cost)", round2(stockValue)],
            ["Potential Revenue (retail)", round2(potentialRevenue)],
            ["Potential Profit", round2(potentialRevenue - stockValue)],
            ["Total Sales Revenue (paid)", round2(salesRevenue)],
            ["Est. Sales Profit", round2(salesProfit)],
        ],
    };
}

/** Format ③: multi-section single CSV — summary + snapshot + sales/movement + raw log. */
export function buildFullReport(
    inventory: InventoryItem[], products: Product[], orders: Order[], logs: InventoryLog[],
): string {
    const sections: [string, ExportSection][] = [
        ["SUMMARY", summarySection(inventory, products, orders, logs)],
        ["INVENTORY SNAPSHOT", buildSnapshot(inventory, products)],
        ["SALES & MOVEMENT", buildSalesMovement(products, orders, logs, inventory)],
        ["MOVEMENT LOG", buildMovementLog(logs)],
    ];
    return sections
        .map(([title, s]) => `${title}\r\n${arrayToCsv(s.headers, s.rows)}`)
        .join("\r\n\r\n");
}

/** Build the CSV string for a single-section format. */
export function sectionToCsv(section: ExportSection): string {
    return arrayToCsv(section.headers, section.rows);
}
