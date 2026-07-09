// ═══════════════════════════════════════════════════════════════════
// Product Catalogue — pure builders (no DOM / no jsPDF)
// Turns products into a branded, category-grouped price list.
// Rendering (PDF / PNG) lives in lib/catalogueExport.ts.
// ═══════════════════════════════════════════════════════════════════

import type { Product } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

// ─── Brand palette (from tailwind.config.ts) ─────────────────────
export const CATALOGUE_BRAND = {
    red: "#B5332E",
    green: "#355E3B",
    cream: "#FDF6EC",
    creamAlt: "#F3E9D9",
    espresso: "#2C1A0E",
    dark: "#1A1A1A",
} as const;

// ─── Types ───────────────────────────────────────────────────────
export interface CatalogueEntry {
    name: string;
    price: number;
    /** e.g. "₦11,000 / kg" */
    priceLabel: string;
}

export interface CatalogueSection {
    category: string;
    items: CatalogueEntry[];
}

/** One rendered image = one category (or a slice of it when it overflows). */
export interface CatalogueImagePage extends CatalogueSection {
    /** 1-based slice index within the category (1 when it fits in one image). */
    part: number;
    /** total slices for this category. */
    totalParts: number;
}

// ─── Price formatting ────────────────────────────────────────────

/** Short unit suffix for a price unit: "kg" | "pack" | "piece" | "". */
export function priceUnitLabel(priceUnit?: Product["priceUnit"]): string {
    switch (priceUnit) {
        case "per_kg":
            return "kg";
        case "per_pack":
            return "pack";
        case "per_piece":
            return "piece";
        default:
            return "";
    }
}

/** "₦11,000 / kg" — drops a trailing .00 for a cleaner price list. */
export function formatCataloguePrice(price: number, priceUnit?: Product["priceUnit"]): string {
    const money = formatCurrency(price).replace(/\.00$/, "");
    const unit = priceUnitLabel(priceUnit);
    return unit ? `${money} / ${unit}` : money;
}

// ─── Selection / grouping ────────────────────────────────────────

/**
 * Turn a raw category value (often a slug like "cow-meat") into a display
 * name ("Cow Meat"): hyphens/underscores → spaces, each word capitalised.
 */
export function formatCategoryName(raw: string): string {
    const cleaned = (raw || "").replace(/[-_]+/g, " ").trim();
    if (!cleaned) return "Other";
    return cleaned
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** A product is sellable if it, or any of its variants, has stock. */
export function productInStock(p: Product): boolean {
    if (Number(p.stock) > 0) return true;
    return (
        Array.isArray(p.variants) &&
        p.variants.some((v) => Number((v as { stock?: number })?.stock ?? 0) > 0)
    );
}

/**
 * Build a catalogue from products: only in-stock items, grouped by category,
 * categories sorted A→Z, items sorted by name within each category.
 * Uncategorised products land under "Other".
 */
export function buildCatalogue(products: Product[]): CatalogueSection[] {
    const byCategory = new Map<string, CatalogueEntry[]>();

    for (const p of products) {
        if (!productInStock(p)) continue;
        const category = formatCategoryName(p.category);
        const entry: CatalogueEntry = {
            name: p.name,
            price: p.price,
            priceLabel: formatCataloguePrice(p.price, p.priceUnit),
        };
        const list = byCategory.get(category);
        if (list) list.push(entry);
        else byCategory.set(category, [entry]);
    }

    return [...byCategory.entries()]
        .map(([category, items]) => ({
            category,
            items: items.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.category.localeCompare(b.category));
}

/** Total sellable items across all sections. */
export function catalogueItemCount(sections: CatalogueSection[]): number {
    return sections.reduce((sum, s) => sum + s.items.length, 0);
}

/**
 * Split sections into image "pages": one image per category, and when a
 * category has more than `maxItemsPerImage` items, break it across several
 * images (part 1 of N, etc.). Keeps each PNG readable.
 */
export function chunkSectionsForImages(
    sections: CatalogueSection[],
    maxItemsPerImage = 16,
): CatalogueImagePage[] {
    const max = Math.max(1, Math.floor(maxItemsPerImage));
    const pages: CatalogueImagePage[] = [];

    for (const section of sections) {
        if (section.items.length === 0) continue;
        const totalParts = Math.ceil(section.items.length / max);
        for (let part = 0; part < totalParts; part++) {
            pages.push({
                category: section.category,
                items: section.items.slice(part * max, part * max + max),
                part: part + 1,
                totalParts,
            });
        }
    }

    return pages;
}
