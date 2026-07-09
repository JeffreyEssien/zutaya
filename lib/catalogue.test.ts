import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import {
    buildCatalogue,
    catalogueItemCount,
    chunkSectionsForImages,
    formatCataloguePrice,
    formatCategoryName,
    priceUnitLabel,
    productInStock,
} from "@/lib/catalogue";

function product(over: Partial<Product> = {}): Product {
    return {
        id: "p1",
        name: "Goat Meat",
        slug: "goat-meat",
        price: 10_000,
        stock: 5,
        images: [],
        variants: [],
        description: "",
        category: "Goat",
        brand: "",
        isFeatured: false,
        isNew: false,
        ...over,
    } as unknown as Product;
}

describe("priceUnitLabel", () => {
    it("maps price units to short suffixes", () => {
        expect(priceUnitLabel("per_kg")).toBe("kg");
        expect(priceUnitLabel("per_pack")).toBe("pack");
        expect(priceUnitLabel("per_piece")).toBe("piece");
        expect(priceUnitLabel("whole")).toBe("");
        expect(priceUnitLabel(undefined)).toBe("");
    });
});

describe("formatCataloguePrice", () => {
    it("drops the trailing .00 and appends the unit", () => {
        expect(formatCataloguePrice(11_000, "per_kg")).toBe("₦11,000 / kg");
    });
    it("omits the unit when there is none", () => {
        expect(formatCataloguePrice(5_000, "whole")).toBe("₦5,000");
        expect(formatCataloguePrice(5_000)).toBe("₦5,000");
    });
    it("keeps real kobo when present", () => {
        expect(formatCataloguePrice(999.5, "per_piece")).toBe("₦999.50 / piece");
    });
});

describe("formatCategoryName", () => {
    it("turns slugs into display names", () => {
        expect(formatCategoryName("cow-meat")).toBe("Cow Meat");
        expect(formatCategoryName("ram_meat")).toBe("Ram Meat");
        expect(formatCategoryName("poultry")).toBe("Poultry");
    });
    it("falls back to Other for blank input", () => {
        expect(formatCategoryName("")).toBe("Other");
        expect(formatCategoryName("  ")).toBe("Other");
    });
    it("leaves already-nice names intact", () => {
        expect(formatCategoryName("Cow Meat")).toBe("Cow Meat");
    });
});

describe("productInStock", () => {
    it("is true when the product has stock", () => {
        expect(productInStock(product({ stock: 3 }))).toBe(true);
    });
    it("is true when a variant has stock even if base stock is 0", () => {
        expect(
            productInStock(
                product({ stock: 0, variants: [{ stock: 0 }, { stock: 4 }] as never }),
            ),
        ).toBe(true);
    });
    it("is false when nothing is in stock", () => {
        expect(productInStock(product({ stock: 0, variants: [] }))).toBe(false);
        expect(
            productInStock(product({ stock: 0, variants: [{ stock: 0 }] as never })),
        ).toBe(false);
    });
});

describe("buildCatalogue", () => {
    it("drops out-of-stock products", () => {
        const sections = buildCatalogue([
            product({ id: "a", name: "In", stock: 2, category: "Beef" }),
            product({ id: "b", name: "Out", stock: 0, category: "Beef" }),
        ]);
        expect(catalogueItemCount(sections)).toBe(1);
        expect(sections[0].items[0].name).toBe("In");
    });

    it("groups by category and sorts categories then items", () => {
        const sections = buildCatalogue([
            product({ id: "1", name: "Ribs", category: "Beef" }),
            product({ id: "2", name: "Brisket", category: "Beef" }),
            product({ id: "3", name: "Leg", category: "Goat" }),
        ]);
        expect(sections.map((s) => s.category)).toEqual(["Beef", "Goat"]);
        expect(sections[0].items.map((i) => i.name)).toEqual(["Brisket", "Ribs"]);
    });

    it("files blank categories under Other", () => {
        const sections = buildCatalogue([product({ category: "" })]);
        expect(sections[0].category).toBe("Other");
    });

    it("carries a formatted price label", () => {
        const sections = buildCatalogue([
            product({ price: 8_000, priceUnit: "per_kg", category: "Beef" }),
        ]);
        expect(sections[0].items[0].priceLabel).toBe("₦8,000 / kg");
    });
});

describe("chunkSectionsForImages", () => {
    it("keeps a small category as a single page", () => {
        const pages = chunkSectionsForImages(
            [{ category: "Beef", items: [{ name: "a", price: 1, priceLabel: "₦1" }] }],
            16,
        );
        expect(pages).toHaveLength(1);
        expect(pages[0].totalParts).toBe(1);
        expect(pages[0].part).toBe(1);
    });

    it("splits a long category across parts", () => {
        const items = Array.from({ length: 5 }, (_, i) => ({
            name: `i${i}`,
            price: 1,
            priceLabel: "₦1",
        }));
        const pages = chunkSectionsForImages([{ category: "Beef", items }], 2);
        expect(pages).toHaveLength(3);
        expect(pages.map((p) => p.items.length)).toEqual([2, 2, 1]);
        expect(pages.map((p) => p.part)).toEqual([1, 2, 3]);
        expect(pages.every((p) => p.totalParts === 3)).toBe(true);
    });

    it("skips empty sections", () => {
        const pages = chunkSectionsForImages([{ category: "Beef", items: [] }], 16);
        expect(pages).toHaveLength(0);
    });
});
