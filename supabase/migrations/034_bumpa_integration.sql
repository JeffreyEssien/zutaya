-- ═══════════════════════════════════════════════════════════════════
-- 034 — Bumpa integration (pull Bumpa store orders → deduct zutaya stock)
--
-- Bumpa's API is read-only orders (GET /api/v1/orders). We stage every
-- fetched order in `bumpa_orders`, map each line to a zutaya product
-- (auto by SKU/name, or manually via `bumpa_product_map`), and — once a
-- PAID order is fully matched — create a native order via create_order_atomic
-- (oversell-safe deduction). `orders.source` / `orders.bumpa_order_id` mark
-- and dedupe imported rows.
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Provenance + dedup on the native orders table ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bumpa_order_id text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_bumpa_order_id_key
    ON orders (bumpa_order_id) WHERE bumpa_order_id IS NOT NULL;

-- ── 2. Manual Bumpa-product → zutaya-product map ──
-- Filled by admin for lines that don't auto-match by SKU/name. Keyed by
-- Bumpa's internal product_id (+ optional variation_id).
CREATE TABLE IF NOT EXISTS bumpa_product_map (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bumpa_product_id text NOT NULL,
    bumpa_variation_id text,
    product_id uuid REFERENCES products (id) ON DELETE CASCADE,
    variant_name text,
    label text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (bumpa_product_id, bumpa_variation_id)
);
CREATE INDEX IF NOT EXISTS bumpa_product_map_product_idx ON bumpa_product_map (product_id);

-- ── 3. Staging / sync log for every fetched Bumpa order ──
-- sync_status: pending_mapping | imported | skipped | error
CREATE TABLE IF NOT EXISTS bumpa_orders (
    bumpa_order_id text PRIMARY KEY,
    unique_hash text,
    payment_status text,
    order_status text,
    shipping_status text,
    customer_name text,
    customer_phone text,
    currency_code text,
    total numeric,
    grand_total numeric,
    order_date date,
    sync_status text NOT NULL DEFAULT 'pending_mapping',
    unmatched jsonb NOT NULL DEFAULT '[]'::jsonb,
    imported_order_id text,
    error text,
    payload jsonb,
    synced_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bumpa_orders_sync_status_idx ON bumpa_orders (sync_status);
CREATE INDEX IF NOT EXISTS bumpa_orders_order_date_idx ON bumpa_orders (order_date DESC);

-- ── 4. RLS: lock down. All access is via the service role (admin API routes),
-- which bypasses RLS. No anon/public policies = nothing public can read sales data.
ALTER TABLE bumpa_product_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE bumpa_orders ENABLE ROW LEVEL SECURITY;
