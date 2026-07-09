import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import { buildGoogleFeedItems, feedToXml } from "@/lib/googleFeed";

function product(over: Partial<Product> = {}): Product {
    return {
        id: "p1",
        name: "Beef Fillet",
        slug: "beef-fillet",
        price: 15000,
        stock: 5,
        images: ["https://img.example/beef.jpg"],
        variants: [],
        description: "<p>Premium <strong>beef</strong> fillet.</p>",
        category: "cow-meat",
        brand: "",
        isFeatured: false,
        isNew: false,
        ...over,
    } as unknown as Product;
}

describe("buildGoogleFeedItems", () => {
    it("maps a product to the required Google attributes", () => {
        const [it0] = buildGoogleFeedItems([product()]);
        expect(it0.id).toBe("p1");
        expect(it0.title).toBe("Beef Fillet");
        expect(it0.description).toBe("Premium beef fillet."); // HTML stripped
        expect(it0.link).toContain("/product/beef-fillet");
        expect(it0.image_link).toBe("https://img.example/beef.jpg");
        expect(it0.availability).toBe("in_stock");
        expect(it0.price).toBe("15000.00 NGN");
        expect(it0.condition).toBe("new");
        expect(it0.identifier_exists).toBe("no");
        expect(it0.product_type).toBe("Cow Meat");
        expect(it0.google_product_category).toContain("Meat");
    });

    it("marks out-of-stock and respects variant stock", () => {
        expect(buildGoogleFeedItems([product({ stock: 0 })])[0].availability).toBe("out_of_stock");
        expect(
            buildGoogleFeedItems([product({ stock: 0, variants: [{ stock: 3 }] as never })])[0]
                .availability,
        ).toBe("in_stock");
    });

    it("adds unit_pricing_measure only for per-kg products", () => {
        expect(buildGoogleFeedItems([product({ priceUnit: "per_kg" })])[0].unit_pricing_measure).toBe(
            "1kg",
        );
        expect(
            buildGoogleFeedItems([product({ priceUnit: "per_piece" })])[0].unit_pricing_measure,
        ).toBeUndefined();
    });

    it("falls back to the site name for brand and skips slugless products", () => {
        expect(buildGoogleFeedItems([product({ brand: "" })])[0].brand).toBeTruthy();
        expect(buildGoogleFeedItems([product({ slug: "" })])).toHaveLength(0);
    });
});

describe("feedToXml", () => {
    it("produces valid RSS with the g: namespace and escapes special chars", () => {
        const xml = feedToXml(buildGoogleFeedItems([product({ name: "Beef & Ribs" })]), {
            title: "Zúta Ya",
            link: "https://z.example",
            description: "feed",
        });
        expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
        expect(xml).toContain("<g:title>Beef &amp; Ribs</g:title>");
        expect(xml).toContain("<g:price>15000.00 NGN</g:price>");
        expect(xml.startsWith("<?xml")).toBe(true);
    });

    it("omits empty optional fields", () => {
        const xml = feedToXml(buildGoogleFeedItems([product({ priceUnit: "per_piece" })]), {
            title: "t",
            link: "l",
            description: "d",
        });
        expect(xml).not.toContain("unit_pricing_measure");
    });
});
