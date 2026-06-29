import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

/**
 * Integration-test DB harness.
 *
 * Runs ONLY when TEST_DATABASE_URL points at a throwaway Postgres (the CI
 * `postgres:16` service, or a local `docker run`). When it's unset, the
 * integration suites skip themselves (see `hasTestDb`) so the normal unit
 * run stays infra-free and green.
 */
export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

const ROOT = resolve(__dirname, "..", "..");
const SCHEMA_SQL = resolve(__dirname, "schema.sql");
const RPC_MIGRATION = resolve(ROOT, "supabase/migrations/025_atomic_orders_and_rate_limit.sql");

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 16 });
  }
  return pool;
}

/**
 * Build the fixture schema, then load the REAL atomic RPC bodies straight
 * from migration 025 — so the logic under test is the production logic.
 */
export async function bootstrap(): Promise<void> {
  const p = getPool();
  await p.query(readFileSync(SCHEMA_SQL, "utf8"));
  await p.query(readFileSync(RPC_MIGRATION, "utf8"));
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Wipe mutable state between tests (keeps the loaded functions in place). */
export async function resetData(): Promise<void> {
  await getPool().query(
    "TRUNCATE products, inventory_items, inventory_logs, coupons, orders RESTART IDENTITY CASCADE",
  );
}

// ── Seed helpers ──

export async function seedProductWithVariant(opts: {
  name?: string;
  variantName: string;
  stock: number;
}): Promise<string> {
  const id = randomUUID();
  const variants = JSON.stringify([{ name: opts.variantName, price: 1000, stock: opts.stock }]);
  await getPool().query(
    "INSERT INTO products (id, name, variants, stock) VALUES ($1, $2, $3::jsonb, $4)",
    [id, opts.name ?? "Test Product", variants, opts.stock],
  );
  return id;
}

export async function seedProductWithInventory(opts: {
  name?: string;
  stock: number;
}): Promise<{ productId: string; inventoryId: string }> {
  const productId = randomUUID();
  const inventoryId = randomUUID();
  await getPool().query("INSERT INTO inventory_items (id, stock) VALUES ($1, $2)", [
    inventoryId,
    opts.stock,
  ]);
  await getPool().query("INSERT INTO products (id, name, stock) VALUES ($1, $2, $3)", [
    productId,
    opts.name ?? "Inventory Product",
    opts.stock,
  ]);
  return { productId, inventoryId };
}

// ── RPC callers (the real functions) ──

export interface OrderItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  variant_name: string | null;
  inventory_item_id: string | null;
}

/**
 * Call the real create_order_atomic. Returns { ok } on success or throws the
 * Postgres error (e.g. "Insufficient stock ...") exactly as production would.
 * Each call uses its own pooled connection, so parallel calls genuinely race.
 */
export async function createOrderAtomic(
  orderId: string,
  items: OrderItemInput[],
  overrides: Record<string, unknown> = {},
): Promise<{ ok: boolean }> {
  const order = {
    id: orderId,
    customer_name: "Test Buyer",
    email: "buyer@example.com",
    phone: "08000000000",
    items: [],
    subtotal: 1000,
    shipping: 0,
    total: 1000,
    status: "pending",
    created_at: new Date().toISOString(),
    ...overrides,
  };
  const res = await getPool().query("SELECT create_order_atomic($1::jsonb, $2::jsonb) AS r", [
    JSON.stringify(order),
    JSON.stringify(items),
  ]);
  return res.rows[0].r as { ok: boolean };
}

export async function restoreStockForOrderAtomic(
  items: Omit<OrderItemInput, "product_name">[],
): Promise<{ restored: number }> {
  const res = await getPool().query("SELECT restore_stock_for_order_atomic($1::jsonb) AS r", [
    JSON.stringify(items),
  ]);
  return res.rows[0].r as { restored: number };
}

// ── Assertion helpers ──

export async function getProductVariantStock(
  productId: string,
  variantName: string,
): Promise<number> {
  const res = await getPool().query("SELECT variants FROM products WHERE id = $1", [productId]);
  const variants = res.rows[0].variants as { name: string; stock: number }[];
  return variants.find((v) => v.name === variantName)?.stock ?? Number.NaN;
}

export async function getInventoryStock(inventoryId: string): Promise<number> {
  const res = await getPool().query("SELECT stock FROM inventory_items WHERE id = $1", [
    inventoryId,
  ]);
  return Number(res.rows[0].stock);
}

export async function countOrders(): Promise<number> {
  const res = await getPool().query("SELECT count(*)::int AS c FROM orders");
  return res.rows[0].c as number;
}
