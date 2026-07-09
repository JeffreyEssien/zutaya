// ═══════════════════════════════════════════════════════════════════
// Google Merchant Center product feed (RSS 2.0 / g: namespace).
// Pure builders — used by both the always-on feed route
// (app/feed/google-merchant.xml) and the admin download button.
// Google scheduled-fetch hits the route URL; it reads live products so
// price/stock edits flow through on Google's next refresh.
// ═══════════════════════════════════════════════════════════════════

import { SITE_NAME } from "@/lib/constants";
import { formatCategoryName } from "@/lib/catalogue";
import { absoluteUrl, stripHtml, truncate } from "@/lib/seo";
import type { Product } from "@/types";

/** Google product taxonomy path for fresh/processed meat. */
const GOOGLE_MEAT_CATEGORY = "Food, Beverages & Tobacco > Food Items > Meat, Seafood & Eggs > Meat";

export interface GoogleFeedItem {
    id: string;
    title: string;
    description: string;
    link: string;
    image_link: string;
    availability: "in_stock" | "out_of_stock";
    price: string; // "15000.00 NGN"
    condition: "new";
    brand: string;
    google_product_category: string;
    product_type: string;
    identifier_exists: "no";
    unit_pricing_measure?: string; // "1kg" for per-kg items
}

function inStock(p: Product): boolean {
    if (Number(p.stock) > 0) return true;
    return (
        Array.isArray(p.variants) &&
        p.variants.some((v) => Number((v as { stock?: number })?.stock ?? 0) > 0)
    );
}

function firstImage(p: Product): string {
    return Array.isArray(p.images) ? (p.images.find((u) => !!u) ?? "") : "";
}

/** Build Google Merchant feed items from products (skips those without a slug). */
export function buildGoogleFeedItems(products: Product[]): GoogleFeedItem[] {
    const items: GoogleFeedItem[] = [];
    for (const p of products) {
        if (!p.slug) continue;
        const item: GoogleFeedItem = {
            id: p.id,
            title: p.name,
            description: truncate(stripHtml(p.description) || p.name, 5000),
            link: absoluteUrl(`/product/${p.slug}`),
            image_link: firstImage(p),
            availability: inStock(p) ? "in_stock" : "out_of_stock",
            price: `${Number(p.price).toFixed(2)} NGN`,
            condition: "new",
            brand: p.brand || SITE_NAME,
            google_product_category: GOOGLE_MEAT_CATEGORY,
            product_type: formatCategoryName(p.category),
            identifier_exists: "no",
        };
        if (p.priceUnit === "per_kg") item.unit_pricing_measure = "1kg";
        items.push(item);
    }
    return items;
}

function xmlEscape(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export interface FeedChannel {
    title: string;
    link: string;
    description: string;
}

/** Serialize feed items to a Google-Shopping RSS 2.0 XML document. */
export function feedToXml(items: GoogleFeedItem[], channel: FeedChannel): string {
    const g = (tag: string, val: string | undefined): string =>
        val != null && val !== "" ? `      <g:${tag}>${xmlEscape(val)}</g:${tag}>\n` : "";

    const itemsXml = items
        .map(
            (it) =>
                "    <item>\n" +
                g("id", it.id) +
                g("title", it.title) +
                g("description", it.description) +
                g("link", it.link) +
                g("image_link", it.image_link) +
                g("availability", it.availability) +
                g("price", it.price) +
                g("condition", it.condition) +
                g("brand", it.brand) +
                g("google_product_category", it.google_product_category) +
                g("product_type", it.product_type) +
                g("identifier_exists", it.identifier_exists) +
                g("unit_pricing_measure", it.unit_pricing_measure) +
                "    </item>",
        )
        .join("\n");

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
        "  <channel>\n" +
        `    <title>${xmlEscape(channel.title)}</title>\n` +
        `    <link>${xmlEscape(channel.link)}</link>\n` +
        `    <description>${xmlEscape(channel.description)}</description>\n` +
        `${itemsXml}\n` +
        "  </channel>\n" +
        "</rss>\n"
    );
}
