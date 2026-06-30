import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrap,
  closePool,
  createOrderAtomic,
  getInventoryStock,
  getProductVariantStock,
  hasTestDb,
  resetData,
  restoreStockForOrderAtomic,
  seedProductWithInventory,
  seedProductWithVariant,
} from "./db";

describe.skipIf(!hasTestDb)("restore_stock_for_order_atomic (real RPC)", () => {
  beforeAll(async () => {
    await bootstrap();
  });
  afterAll(async () => {
    await closePool();
  });
  beforeEach(async () => {
    await resetData();
  });

  it("deduct → restore returns the variant stock to exactly its starting value", async () => {
    const productId = await seedProductWithVariant({ variantName: "1kg", stock: 10 });
    await createOrderAtomic("ZY-20260629-3001", [
      {
        product_id: productId,
        product_name: "Goat",
        quantity: 4,
        variant_name: "1kg",
        inventory_item_id: null,
      },
    ]);
    expect(await getProductVariantStock(productId, "1kg")).toBe(6);

    const { restored } = await restoreStockForOrderAtomic([
      { product_id: productId, quantity: 4, variant_name: "1kg", inventory_item_id: null },
    ]);
    expect(restored).toBe(1); // one line restored
    expect(await getProductVariantStock(productId, "1kg")).toBe(10);
  });

  it("restores inventory-backed stock exactly", async () => {
    const { productId, inventoryId } = await seedProductWithInventory({ stock: 8 });
    await createOrderAtomic("ZY-20260629-3002", [
      {
        product_id: productId,
        product_name: "Beef",
        quantity: 5,
        variant_name: null,
        inventory_item_id: inventoryId,
      },
    ]);
    expect(await getInventoryStock(inventoryId)).toBe(3);

    await restoreStockForOrderAtomic([
      { product_id: productId, quantity: 5, variant_name: null, inventory_item_id: inventoryId },
    ]);
    expect(await getInventoryStock(inventoryId)).toBe(8);
  });

  it("restores every line of a multi-item order in one transaction", async () => {
    const a = await seedProductWithVariant({ name: "Goat", variantName: "1kg", stock: 10 });
    const { productId: b, inventoryId } = await seedProductWithInventory({ stock: 6 });
    await createOrderAtomic("ZY-20260629-3003", [
      {
        product_id: a,
        product_name: "Goat",
        quantity: 2,
        variant_name: "1kg",
        inventory_item_id: null,
      },
      {
        product_id: b,
        product_name: "Beef",
        quantity: 3,
        variant_name: null,
        inventory_item_id: inventoryId,
      },
    ]);

    const { restored } = await restoreStockForOrderAtomic([
      { product_id: a, quantity: 2, variant_name: "1kg", inventory_item_id: null },
      { product_id: b, quantity: 3, variant_name: null, inventory_item_id: inventoryId },
    ]);
    expect(restored).toBe(2);
    expect(await getProductVariantStock(a, "1kg")).toBe(10);
    expect(await getInventoryStock(inventoryId)).toBe(6);
  });
});
