import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrap,
  closePool,
  getInventoryStock,
  getPool,
  getProductVariantStock,
  hasTestDb,
  resetData,
  seedProductWithInventory,
  seedProductWithVariant,
} from "./db";

// Migration 030: the legacy non-atomic restore RPCs must also restore exact kg.
describe.skipIf(!hasTestDb)("legacy restore RPCs (migration 030, NUMERIC)", () => {
  beforeAll(async () => {
    await bootstrap();
  });
  afterAll(async () => {
    await closePool();
  });
  beforeEach(async () => {
    await resetData();
  });

  it("restore_stock adds an exact decimal weight to inventory", async () => {
    const { inventoryId } = await seedProductWithInventory({ stock: 10 });
    await getPool().query("SELECT restore_stock($1, $2)", [inventoryId, 2.5]);
    expect(await getInventoryStock(inventoryId)).toBe(12.5);
  });

  it("restore_variant_stock adds an exact decimal weight to a variant", async () => {
    const productId = await seedProductWithVariant({ variantName: "1kg", stock: 4 });
    await getPool().query("SELECT restore_variant_stock($1, $2, $3)", [productId, "1kg", 1.5]);
    expect(await getProductVariantStock(productId, "1kg")).toBe(5.5);
  });
});
