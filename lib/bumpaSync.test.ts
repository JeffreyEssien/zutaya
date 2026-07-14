import { describe, expect, it } from "vitest";
import type { BumpaOrder } from "@/lib/bumpa";
import {
    buildImportedOrder,
    buildMatchContext,
    matchLine,
    normalizeBumpaOrder,
    type MapEntry,
} from "@/lib/bumpaSync";
import type { InventoryItem, Product } from "@/types";

// A Bumpa order shaped like the real /api/v1/orders payload (from their OpenAPI spec).
const rawOrder: BumpaOrder = {
    id: 10303,
    store_id: 1,
    channel: "API",
    origin: "Dropper",
    status: "OPEN",
    payment_status: "PAID",
    shipping_status: "UNFULFILLED",
    currency_code: "NGN",
    total: "27500.00",
    sub_total: "27500.00",
    grand_total: "31500.0000",
    amount_paid: "31500.00",
    shipping_price: "4000.00",
    total_discount: "0.00",
    order_date: "2026-07-10",
    unique_hash: "aG3nA1BmrC24VR0U",
    created_at: "2026-07-10T01:48:50.000000Z",
    updated_at: "2026-07-10T01:48:50.000000Z",
    customer_details: {
        name: "Taylor Sweet",
        phone: "08031157415",
        street: "D 2-3 Mutual Alpha Courts",
        city: "Surulere",
        state: "Lagos",
        country: "Nigeria",
        zip: "100278",
    },
    shipping_details: {
        name: "Taylor Sweet",
        phone: "08031157415",
        street: "D 2-3 Mutual Alpha Courts",
        city: "Surulere",
        state: "Lagos",
        country: "Nigeria",
        zip: "100278",
    },
    order_items: [
        // matches by SKU
        { id: 41, product_id: 4, product_variation_id: null, order_id: 10303, name: null, sku: "GT-01", options: null, quantity: "2.50", price: "11000.00", total: "27500.00", thumbnail_url: null },
        // matches by name
        { id: 42, product_id: 154, product_variation_id: null, order_id: 10303, name: "Cow Leg", sku: null, options: null, quantity: "1.00", price: "13000.00", total: "13000.00", thumbnail_url: null },
    ],
};

const products: Product[] = [
    { id: "p-goat", slug: "goat-meat", name: "Goat Meat", description: "", price: 11000, category: "Goat Meat", brand: "Z", inventoryId: "inv-goat", stock: 20, images: [], variants: [], isFeatured: false, isNew: false, priceUnit: "per_kg" } as Product,
    { id: "p-cowleg", slug: "cow-leg", name: "Cow Leg", description: "", price: 13000, category: "Cow Meat", brand: "Z", stock: 12, images: [], variants: [], isFeatured: false, isNew: false, priceUnit: "per_piece" } as Product,
];
const inventory: InventoryItem[] = [
    { id: "inv-goat", sku: "GT-01", name: "Goat Meat", costPrice: 8000, sellingPrice: 11000, stock: 18, reorderLevel: 2, createdAt: "", updatedAt: "" },
];

describe("normalizeBumpaOrder", () => {
    it("flattens fields and parses decimal quantity", () => {
        const n = normalizeBumpaOrder(rawOrder);
        expect(n.bumpaOrderId).toBe("10303");
        expect(n.paymentStatus).toBe("PAID");
        expect(n.customerName).toBe("Taylor Sweet");
        expect(n.phone).toBe("08031157415");
        expect(n.city).toBe("Surulere");
        expect(n.total).toBe(31500);
        expect(n.shipping).toBe(4000);
        expect(n.items).toHaveLength(2);
        expect(n.items[0].quantity).toBe(2.5); // weight-based decimal preserved
        expect(n.items[0].sku).toBe("GT-01");
    });
});

describe("matchLine", () => {
    const ctx = buildMatchContext(products, inventory, []);

    it("matches by SKU", () => {
        const n = normalizeBumpaOrder(rawOrder);
        const m = matchLine(n.items[0], ctx);
        expect(m?.product.id).toBe("p-goat");
    });

    it("matches by name when SKU is absent", () => {
        const n = normalizeBumpaOrder(rawOrder);
        const m = matchLine(n.items[1], ctx);
        expect(m?.product.id).toBe("p-cowleg");
    });

    it("returns null for an unknown product", () => {
        const m = matchLine(
            { bumpaProductId: "999", variationId: null, sku: "NOPE", name: "Unknown", options: null, quantity: 1, price: 0, total: 0 },
            ctx,
        );
        expect(m).toBeNull();
    });

    it("honours a manual map over SKU/name", () => {
        const mapRows: MapEntry[] = [{ bumpaProductId: "999", bumpaVariationId: null, productId: "p-cowleg", variantName: null }];
        const mapped = buildMatchContext(products, inventory, mapRows);
        const m = matchLine(
            { bumpaProductId: "999", variationId: null, sku: null, name: null, options: null, quantity: 1, price: 0, total: 0 },
            mapped,
        );
        expect(m?.product.id).toBe("p-cowleg");
    });
});

describe("buildImportedOrder", () => {
    it("builds a paid zutaya order with matched lines", () => {
        const n = normalizeBumpaOrder(rawOrder);
        const matches = n.items.map((line) => matchLine(line, buildMatchContext(products, inventory, []))!);
        const order = buildImportedOrder(n, matches);
        expect(order.id).toBe("BM-10303");
        expect(order.paymentStatus).toBe("payment_confirmed");
        expect(order.status).toBe("processing");
        expect(order.items).toHaveLength(2);
        expect(order.items[0].quantity).toBe(2.5);
        expect(order.shippingAddress.firstName).toBe("Taylor");
        expect(order.shippingAddress.lastName).toBe("Sweet");
        expect(order.shippingAddress.city).toBe("Surulere");
        expect(order.total).toBe(31500);
    });
});
