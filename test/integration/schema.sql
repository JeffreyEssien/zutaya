-- ════════════════════════════════════════════════════════════════════
-- Integration-test fixture schema.
--
-- This is NOT the production schema. It creates ONLY the tables (and only
-- the columns) that the atomic RPCs in migration 025 actually touch, so a
-- throwaway Postgres can exercise the REAL function bodies. The functions
-- themselves are loaded verbatim from
-- supabase/migrations/025_atomic_orders_and_rate_limit.sql by the harness —
-- we never reimplement the logic under test.
-- ════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS inventory_logs CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
    id        UUID PRIMARY KEY,
    name      TEXT,
    variants  JSONB,
    stock     NUMERIC DEFAULT 0   -- NUMERIC: supports weight-based (0.5 kg) stock
);

CREATE TABLE inventory_items (
    id         UUID PRIMARY KEY,
    stock      NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID,
    change_amount NUMERIC,
    reason        TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE coupons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT,
    usage_count     INT DEFAULT 0
);

-- Order id is the human reference (ZY-YYYYMMDD-XXXX), so TEXT not UUID.
-- 'status' must exist before migration 025's ALTER ... ADD CONSTRAINT runs.
CREATE TABLE orders (
    id                       TEXT PRIMARY KEY,
    customer_name            TEXT,
    email                    TEXT,
    phone                    TEXT,
    items                    JSONB,
    subtotal                 NUMERIC,
    shipping                 NUMERIC,
    total                    NUMERIC,
    status                   TEXT DEFAULT 'pending',
    shipping_address         JSONB,
    notes                    TEXT,
    coupon_code              TEXT,
    discount_total           NUMERIC DEFAULT 0,
    payment_method           TEXT,
    sender_name              TEXT,
    payment_status           TEXT,
    paystack_reference       TEXT,
    processing_fee           NUMERIC DEFAULT 0,
    delivery_zone            TEXT,
    delivery_type            TEXT,
    delivery_discount        JSONB,
    delivery_fee             NUMERIC DEFAULT 0,
    packaging_fee            NUMERIC DEFAULT 0,
    prep_fee                 NUMERIC DEFAULT 0,
    prep_instructions        TEXT,
    requested_delivery_date  DATE,
    requested_delivery_slot  TEXT,
    subscription_id          UUID,
    created_at               TIMESTAMPTZ DEFAULT now()
);
