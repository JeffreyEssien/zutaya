-- ════════════════════════════════════════════════════════════════════
--  Migration 027 — Performance indexes (purely additive, zero behaviour change)
--
--  The schema is already well-indexed (orders.status, orders.payment_status,
--  payments.*, products.category, newsletter active, etc.). This migration only
--  fills the genuinely-missing gaps that match real query predicates:
--
--   1. orders.created_at        — every admin/order list + analytics sorts
--                                 `ORDER BY created_at DESC` (lib/queries.ts ×15).
--                                 No index existed for it.
--   2. coupons UPPER(code)      — createOrder + increment_coupon_usage filter on
--                                 `WHERE UPPER(code) = UPPER($1)`. A functional
--                                 index matches that predicate exactly.
--   3. inventory_logs(product_id, created_at) — analytics (Kg-sold, margins) read
--                                 this table by product over a date range; unindexed.
--
--  All `IF NOT EXISTS` so re-running is safe. Every referenced column verified to
--  exist in the live schema before writing this migration.
-- ════════════════════════════════════════════════════════════════════

-- 1. Orders sorted newest-first (admin dashboards, analytics, recent-orders polling)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- 2. Coupon code lookup — matches the exact `UPPER(code)` predicate used at checkout
CREATE INDEX IF NOT EXISTS idx_coupons_code_upper ON coupons (UPPER(code));

-- 3. Inventory movement history for analytics (per-product over time)
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs (product_id);
