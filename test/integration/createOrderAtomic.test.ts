import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrap,
  closePool,
  countOrders,
  createOrderAtomic,
  getInventoryStock,
  getProductVariantStock,
  hasTestDb,
  resetData,
  seedProductWithInventory,
  seedProductWithVariant,
} from "./db";

// Skips entirely when TEST_DATABASE_URL is unset → the normal unit run is unaffected.
describe.skipIf(!hasTestDb)("create_order_atomic (real RPC, real Postgres)", () => {
  beforeAll(async () => {
    await bootstrap();
  });
  afterAll(async () => {
    await closePool();
  });
  beforeEach(async () => {
    await resetData();
  });

  it("deducts variant stock on a successful order", async () => {
    const productId = await seedProductWithVariant({ variantName: "1kg", stock: 10 });
    const res = await createOrderAtomic("ZY-20260629-0001", [
      { product_id: productId, product_name: "Goat", quantity: 3, variant_name: "1kg", inventory_item_id: null },
    ]);
    expect(res.ok).toBe(true);
    expect(await getProductVariantStock(productId, "1kg")).toBe(7);
    expect(await countOrders()).toBe(1);
  });

  it("deducts inventory-item stock when there is no variant", async () => {
    const { productId, inventoryId } = await seedProductWithInventory({ stock: 8 });
    await createOrderAtomic("ZY-20260629-0002", [
      { product_id: productId, product_name: "Beef", quantity: 5, variant_name: null, inventory_item_id: inventoryId },
    ]);
    expect(await getInventoryStock(inventoryId)).toBe(3);
  });

  it("rolls the WHOLE order back if any line is short (no partial deduction, no orphan order)", async () => {
    const okProduct = await seedProductWithVariant({ name: "Goat", variantName: "1kg", stock: 10 });
    const shortProduct = await seedProductWithVariant({ name: "Shaki", variantName: "pack", stock: 1 });

    await expect(
      createOrderAtomic("ZY-20260629-0003", [
        { product_id: okProduct, product_name: "Goat", quantity: 2, variant_name: "1kg", inventory_item_id: null },
        { product_id: shortProduct, product_name: "Shaki", quantity: 5, variant_name: "pack", inventory_item_id: null },
      ]),
    ).rejects.toThrow(/Insufficient stock/i);

    // The first line must NOT have been deducted, and no order row may exist.
    expect(await getProductVariantStock(okProduct, "1kg")).toBe(10);
    expect(await getProductVariantStock(shortProduct, "pack")).toBe(1);
    expect(await countOrders()).toBe(0);
  });

  it("CONCURRENCY: N parallel orders for the last units never oversell", async () => {
    // 3 units in stock; fire 10 simultaneous single-unit orders.
    const productId = await seedProductWithVariant({ variantName: "1kg", stock: 3 });

    const attempts = Array.from({ length: 10 }, (_, i) =>
      createOrderAtomic(`ZY-20260629-1${String(i).padStart(3, "0")}`, [
        { product_id: productId, product_name: "Goat", quantity: 1, variant_name: "1kg", inventory_item_id: null },
      ])
        .then(() => "ok" as const)
        .catch(() => "fail" as const),
    );
    const results = await Promise.all(attempts);

    const succeeded = results.filter((r) => r === "ok").length;
    const failed = results.filter((r) => r === "fail").length;

    // Exactly the available stock may succeed — the rest are cleanly rejected.
    expect(succeeded).toBe(3);
    expect(failed).toBe(7);
    // Stock lands at exactly zero — never negative.
    expect(await getProductVariantStock(productId, "1kg")).toBe(0);
    // One order row per successful charge.
    expect(await countOrders()).toBe(3);
  });

  it("CONCURRENCY: inventory-backed product also can't go negative", async () => {
    const { productId, inventoryId } = await seedProductWithInventory({ stock: 5 });
    const attempts = Array.from({ length: 12 }, (_, i) =>
      createOrderAtomic(`ZY-20260629-2${String(i).padStart(3, "0")}`, [
        { product_id: productId, product_name: "Beef", quantity: 1, variant_name: null, inventory_item_id: inventoryId },
      ])
        .then(() => "ok" as const)
        .catch(() => "fail" as const),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok").length).toBe(5);
    expect(await getInventoryStock(inventoryId)).toBe(0);
  });
});
