import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrap,
  closePool,
  createOrderAtomic,
  getInventoryStock,
  hasTestDb,
  resetData,
  seedProductWithInventory,
} from "./db";

// Weight-based ordering (migration 029): quantities are NUMERIC kg, deducted
// from inventory weight. Must be exact AND still oversell-proof.
describe.skipIf(!hasTestDb)("weight-based (decimal kg) orders", () => {
  beforeAll(async () => {
    await bootstrap();
  });
  afterAll(async () => {
    await closePool();
  });
  beforeEach(async () => {
    await resetData();
  });

  it("deducts an exact half-kg amount from inventory weight", async () => {
    const { productId, inventoryId } = await seedProductWithInventory({ stock: 50 });
    await createOrderAtomic("ZY-20260629-4001", [
      { product_id: productId, product_name: "Goat", quantity: 2.5, variant_name: null, inventory_item_id: inventoryId },
    ]);
    expect(await getInventoryStock(inventoryId)).toBe(47.5);
  });

  it("accumulates several decimal orders without drift", async () => {
    const { productId, inventoryId } = await seedProductWithInventory({ stock: 10 });
    for (const kg of [1.5, 2, 0.5, 1]) {
      await createOrderAtomic(`ZY-20260629-42${kg}`, [
        { product_id: productId, product_name: "Goat", quantity: kg, variant_name: null, inventory_item_id: inventoryId },
      ]);
    }
    // 10 - (1.5 + 2 + 0.5 + 1) = 5
    expect(await getInventoryStock(inventoryId)).toBe(5);
  });

  it("rejects an order that exceeds the remaining weight (no negative stock)", async () => {
    const { productId, inventoryId } = await seedProductWithInventory({ stock: 3 });
    await expect(
      createOrderAtomic("ZY-20260629-4003", [
        { product_id: productId, product_name: "Goat", quantity: 3.5, variant_name: null, inventory_item_id: inventoryId },
      ]),
    ).rejects.toThrow(/Insufficient stock/i);
    expect(await getInventoryStock(inventoryId)).toBe(3); // untouched
  });

  it("CONCURRENCY: parallel weight orders never oversell the total kg", async () => {
    // 5 kg in stock; fire 5 simultaneous 2 kg orders → only 2 can succeed (4 kg).
    const { productId, inventoryId } = await seedProductWithInventory({ stock: 5 });
    const attempts = Array.from({ length: 5 }, (_, i) =>
      createOrderAtomic(`ZY-20260629-44${i}`, [
        { product_id: productId, product_name: "Goat", quantity: 2, variant_name: null, inventory_item_id: inventoryId },
      ])
        .then(() => "ok" as const)
        .catch(() => "fail" as const),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok").length).toBe(2);
    const left = await getInventoryStock(inventoryId);
    expect(left).toBe(1); // 5 - 2*2 = 1, never negative
    expect(left).toBeGreaterThanOrEqual(0);
  });
});
