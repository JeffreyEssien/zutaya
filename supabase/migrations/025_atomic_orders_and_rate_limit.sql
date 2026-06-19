-- ════════════════════════════════════════════════════════════════════
--  Migration 025 — Atomic order creation + rate limiting
--
--  Solves:
--   1. Stock leak when a multi-item createOrder fails partway (no transaction)
--   2. Stock leak when Paystack init fails after order create
--   3. Bot-spam protection on /api/paystack/initialize
--   4. Natural per-product queueing (FOR UPDATE row locks) — no more global lock
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Atomic order creation ───────────────────────────────────────
-- One RPC, one transaction. If ANY step fails, the entire thing rolls
-- back: no leaked stock, no orphan order rows.
--
-- Concurrency: FOR UPDATE locks each product row touched. Two orders
-- for DIFFERENT products run in parallel. Two orders for the SAME
-- product wait their turn (microseconds). Perfect natural queue.
--
-- Items shape (JSONB array):
--   [{
--     "product_id": "uuid",
--     "product_name": "...",
--     "quantity": 2,
--     "variant_name": "500g" | null,          // null = main inventory
--     "inventory_item_id": "uuid" | null      // required when variant_name is null
--   }, ...]

CREATE OR REPLACE FUNCTION create_order_atomic(
    p_order JSONB,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item               JSONB;
    v_product_id         UUID;
    v_variant_name       TEXT;
    v_inventory_id       UUID;
    v_quantity           INT;
    v_variants           JSONB;
    v_variant_idx        INT;
    v_current_stock      INT;
    v_inv_current        NUMERIC;
    v_updated_variants   JSONB;
    v_coupon_code        TEXT;
BEGIN
    -- ── Step 1: lock + deduct stock for every item ──
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id   := (v_item->>'product_id')::UUID;
        v_variant_name := v_item->>'variant_name';
        v_inventory_id := NULLIF(v_item->>'inventory_item_id', '')::UUID;
        v_quantity     := (v_item->>'quantity')::INT;

        IF v_variant_name IS NOT NULL THEN
            -- Variant path
            SELECT variants INTO v_variants
              FROM products
             WHERE id = v_product_id
             FOR UPDATE;                              -- ← row-level lock
            IF v_variants IS NULL THEN
                RAISE EXCEPTION 'Product not found: %', v_product_id;
            END IF;

            IF jsonb_typeof(v_variants) = 'string' THEN
                v_variants := (v_variants #>> '{}')::JSONB;
            END IF;

            SELECT idx - 1 INTO v_variant_idx
              FROM jsonb_array_elements(v_variants) WITH ORDINALITY arr(elem, idx)
             WHERE elem->>'name' = v_variant_name
             LIMIT 1;

            IF v_variant_idx IS NULL THEN
                RAISE EXCEPTION 'Variant "%" not found on product %', v_variant_name, v_product_id;
            END IF;

            v_current_stock := COALESCE((v_variants->v_variant_idx->>'stock')::INT, 0);

            IF v_current_stock < v_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for "%" (variant %). Available: %, requested: %',
                    (v_item->>'product_name'), v_variant_name, v_current_stock, v_quantity;
            END IF;

            v_updated_variants := jsonb_set(
                v_variants,
                ARRAY[v_variant_idx::text, 'stock'],
                to_jsonb(v_current_stock - v_quantity)
            );

            UPDATE products
               SET variants = v_updated_variants,
                   stock = (
                       SELECT COALESCE(SUM((elem->>'stock')::INT), 0)
                         FROM jsonb_array_elements(v_updated_variants) AS elem
                   )
             WHERE id = v_product_id;

            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, -v_quantity, 'order_variant_' || v_variant_name);

        ELSIF v_inventory_id IS NOT NULL THEN
            -- Main inventory path
            SELECT stock INTO v_inv_current
              FROM inventory_items
             WHERE id = v_inventory_id
             FOR UPDATE;                              -- ← row-level lock
            IF v_inv_current IS NULL THEN
                RAISE EXCEPTION 'Inventory item not found: %', v_inventory_id;
            END IF;
            IF v_inv_current < v_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
                    (v_item->>'product_name'), v_inv_current, v_quantity;
            END IF;

            UPDATE inventory_items
               SET stock = stock - v_quantity, updated_at = now()
             WHERE id = v_inventory_id;

            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, -v_quantity, 'order_main');
        END IF;
        -- If neither variant nor inventory_item_id is set, item has no stock backing — skip.
    END LOOP;

    -- ── Step 2: insert the order row ──
    INSERT INTO orders (
        id, customer_name, email, phone, items, subtotal, shipping, total,
        status, shipping_address, notes, coupon_code, discount_total,
        payment_method, sender_name, payment_status, paystack_reference,
        processing_fee, delivery_zone, delivery_type, delivery_discount,
        delivery_fee, packaging_fee, prep_fee, prep_instructions,
        requested_delivery_date, requested_delivery_slot, subscription_id,
        created_at
    ) VALUES (
        p_order->>'id',
        p_order->>'customer_name',
        p_order->>'email',
        p_order->>'phone',
        COALESCE(p_order->'items', '[]'::jsonb),
        (p_order->>'subtotal')::NUMERIC,
        (p_order->>'shipping')::NUMERIC,
        (p_order->>'total')::NUMERIC,
        COALESCE(p_order->>'status', 'pending'),
        p_order->'shipping_address',
        p_order->>'notes',
        p_order->>'coupon_code',
        COALESCE((p_order->>'discount_total')::NUMERIC, 0),
        p_order->>'payment_method',
        p_order->>'sender_name',
        p_order->>'payment_status',
        p_order->>'paystack_reference',
        COALESCE((p_order->>'processing_fee')::NUMERIC, 0),
        p_order->>'delivery_zone',
        p_order->>'delivery_type',
        p_order->'delivery_discount',
        COALESCE((p_order->>'delivery_fee')::NUMERIC, 0),
        COALESCE((p_order->>'packaging_fee')::NUMERIC, 0),
        COALESCE((p_order->>'prep_fee')::NUMERIC, 0),
        p_order->>'prep_instructions',
        NULLIF(p_order->>'requested_delivery_date', '')::DATE,
        p_order->>'requested_delivery_slot',
        NULLIF(p_order->>'subscription_id', '')::UUID,
        COALESCE((p_order->>'created_at')::TIMESTAMPTZ, now())
    );

    -- ── Step 3: increment coupon usage (best-effort, inside same txn) ──
    v_coupon_code := p_order->>'coupon_code';
    IF v_coupon_code IS NOT NULL AND v_coupon_code <> '' THEN
        UPDATE coupons
           SET usage_count = COALESCE(usage_count, 0) + 1
         WHERE UPPER(code) = UPPER(v_coupon_code);
    END IF;

    RETURN jsonb_build_object('ok', true, 'order_id', p_order->>'id');
END;
$$ LANGUAGE plpgsql;

-- Atomically restore stock for every item in an order (called when payment fails).
CREATE OR REPLACE FUNCTION restore_stock_for_order_atomic(
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item               JSONB;
    v_product_id         UUID;
    v_variant_name       TEXT;
    v_inventory_id       UUID;
    v_quantity           INT;
    v_variants           JSONB;
    v_variant_idx        INT;
    v_current_stock      INT;
    v_updated_variants   JSONB;
    v_restored           INT := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id   := (v_item->>'product_id')::UUID;
        v_variant_name := v_item->>'variant_name';
        v_inventory_id := NULLIF(v_item->>'inventory_item_id', '')::UUID;
        v_quantity     := (v_item->>'quantity')::INT;

        IF v_variant_name IS NOT NULL THEN
            SELECT variants INTO v_variants FROM products WHERE id = v_product_id FOR UPDATE;
            IF v_variants IS NULL THEN CONTINUE; END IF;
            IF jsonb_typeof(v_variants) = 'string' THEN
                v_variants := (v_variants #>> '{}')::JSONB;
            END IF;

            SELECT idx - 1 INTO v_variant_idx
              FROM jsonb_array_elements(v_variants) WITH ORDINALITY arr(elem, idx)
             WHERE elem->>'name' = v_variant_name LIMIT 1;
            IF v_variant_idx IS NULL THEN CONTINUE; END IF;

            v_current_stock := COALESCE((v_variants->v_variant_idx->>'stock')::INT, 0);
            v_updated_variants := jsonb_set(
                v_variants, ARRAY[v_variant_idx::text, 'stock'],
                to_jsonb(v_current_stock + v_quantity)
            );
            UPDATE products
               SET variants = v_updated_variants,
                   stock = (SELECT COALESCE(SUM((e->>'stock')::INT), 0)
                              FROM jsonb_array_elements(v_updated_variants) AS e)
             WHERE id = v_product_id;
            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, v_quantity, 'restore_variant_' || v_variant_name || '_payment_failed');
            v_restored := v_restored + 1;
        ELSIF v_inventory_id IS NOT NULL THEN
            UPDATE inventory_items
               SET stock = COALESCE(stock, 0) + v_quantity, updated_at = now()
             WHERE id = v_inventory_id;
            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, v_quantity, 'restore_main_payment_failed');
            v_restored := v_restored + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('restored', v_restored);
END;
$$ LANGUAGE plpgsql;

-- ── 2. Rate limiting ───────────────────────────────────────────────
-- Simple sliding-window-ish rate limiter backed by a table.
-- Bucket-key = "init:ip:1.2.3.4" or "init:email:foo@bar.com".

CREATE TABLE IF NOT EXISTS rate_limits (
    bucket_key TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    counter INT NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket_key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Returns the count after increment. Caller compares to threshold.
-- Window length is fixed at the granularity used by the caller (we'll use minute buckets).
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_bucket_key TEXT,
    p_window_start TIMESTAMPTZ
) RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO rate_limits (bucket_key, window_start, counter)
    VALUES (p_bucket_key, p_window_start, 1)
    ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET counter = rate_limits.counter + 1
    RETURNING counter INTO v_count;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- House-keeping: drop old buckets. Caller invokes from cron.
CREATE OR REPLACE FUNCTION cleanup_rate_limits(p_older_than_hours INT DEFAULT 24)
RETURNS INT AS $$
DECLARE v_deleted INT;
BEGIN
    DELETE FROM rate_limits
     WHERE window_start < (now() - (p_older_than_hours || ' hours')::INTERVAL);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ── 3. Add 'cancelled' to orders.status check constraint ──
-- We use this when payment fails to mark abandoned orders so they don't
-- pollute the admin "pending" view.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending','processing','packed','out_for_delivery','delivered','cancelled'));
