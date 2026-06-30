-- ════════════════════════════════════════════════════════════════════
--  Migration 029 — Weight-based (decimal) quantities
--
--  Customers can order meat by weight in 0.5 kg steps (1, 1.5, 2 … 50 kg).
--  Until now stock and order quantities were INT, so a 2.5 kg order would
--  truncate to 2. This migration moves stock + quantity to NUMERIC end to
--  end and re-creates the atomic RPCs with a NUMERIC quantity so weight
--  deduction is exact and STILL oversell-proof (same FOR UPDATE row locks).
--
--  Safe: ALTER ... TYPE NUMERIC USING col::numeric preserves every value;
--  whole-number/per-unit products are unaffected (3 == 3.0).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Widen stock + log columns to NUMERIC ──
ALTER TABLE inventory_items ALTER COLUMN stock TYPE NUMERIC USING stock::numeric;
ALTER TABLE products        ALTER COLUMN stock TYPE NUMERIC USING stock::numeric;
ALTER TABLE inventory_logs  ALTER COLUMN change_amount TYPE NUMERIC USING change_amount::numeric;

-- ── 2. Re-create create_order_atomic with NUMERIC quantity/stock ──
CREATE OR REPLACE FUNCTION create_order_atomic(
    p_order JSONB,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item               JSONB;
    v_product_id         UUID;
    v_variant_name       TEXT;
    v_inventory_id       UUID;
    v_quantity           NUMERIC;          -- ← was INT
    v_variants           JSONB;
    v_variant_idx        INT;
    v_current_stock      NUMERIC;          -- ← was INT
    v_inv_current        NUMERIC;
    v_updated_variants   JSONB;
    v_coupon_code        TEXT;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id   := (v_item->>'product_id')::UUID;
        v_variant_name := v_item->>'variant_name';
        v_inventory_id := NULLIF(v_item->>'inventory_item_id', '')::UUID;
        v_quantity     := (v_item->>'quantity')::NUMERIC;

        IF v_variant_name IS NOT NULL THEN
            SELECT variants INTO v_variants FROM products WHERE id = v_product_id FOR UPDATE;
            IF v_variants IS NULL THEN
                RAISE EXCEPTION 'Product not found: %', v_product_id;
            END IF;
            IF jsonb_typeof(v_variants) = 'string' THEN
                v_variants := (v_variants #>> '{}')::JSONB;
            END IF;

            SELECT idx - 1 INTO v_variant_idx
              FROM jsonb_array_elements(v_variants) WITH ORDINALITY arr(elem, idx)
             WHERE elem->>'name' = v_variant_name LIMIT 1;
            IF v_variant_idx IS NULL THEN
                RAISE EXCEPTION 'Variant "%" not found on product %', v_variant_name, v_product_id;
            END IF;

            v_current_stock := COALESCE((v_variants->v_variant_idx->>'stock')::NUMERIC, 0);
            IF v_current_stock < v_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for "%" (variant %). Available: %, requested: %',
                    (v_item->>'product_name'), v_variant_name, v_current_stock, v_quantity;
            END IF;

            v_updated_variants := jsonb_set(
                v_variants, ARRAY[v_variant_idx::text, 'stock'],
                to_jsonb(v_current_stock - v_quantity)
            );
            UPDATE products
               SET variants = v_updated_variants,
                   stock = (SELECT COALESCE(SUM((elem->>'stock')::NUMERIC), 0)
                              FROM jsonb_array_elements(v_updated_variants) AS elem)
             WHERE id = v_product_id;
            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, -v_quantity, 'order_variant_' || v_variant_name);

        ELSIF v_inventory_id IS NOT NULL THEN
            SELECT stock INTO v_inv_current FROM inventory_items WHERE id = v_inventory_id FOR UPDATE;
            IF v_inv_current IS NULL THEN
                RAISE EXCEPTION 'Inventory item not found: %', v_inventory_id;
            END IF;
            IF v_inv_current < v_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
                    (v_item->>'product_name'), v_inv_current, v_quantity;
            END IF;

            UPDATE inventory_items SET stock = stock - v_quantity, updated_at = now()
             WHERE id = v_inventory_id;
            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, -v_quantity, 'order_main');
        END IF;
    END LOOP;

    INSERT INTO orders (
        id, customer_name, email, phone, items, subtotal, shipping, total,
        status, shipping_address, notes, coupon_code, discount_total,
        payment_method, sender_name, payment_status, paystack_reference,
        processing_fee, delivery_zone, delivery_type, delivery_discount,
        delivery_fee, packaging_fee, prep_fee, prep_instructions,
        requested_delivery_date, requested_delivery_slot, subscription_id, created_at
    ) VALUES (
        p_order->>'id', p_order->>'customer_name', p_order->>'email', p_order->>'phone',
        COALESCE(p_order->'items', '[]'::jsonb),
        (p_order->>'subtotal')::NUMERIC, (p_order->>'shipping')::NUMERIC, (p_order->>'total')::NUMERIC,
        COALESCE(p_order->>'status', 'pending'), p_order->'shipping_address', p_order->>'notes',
        p_order->>'coupon_code', COALESCE((p_order->>'discount_total')::NUMERIC, 0),
        p_order->>'payment_method', p_order->>'sender_name', p_order->>'payment_status',
        p_order->>'paystack_reference', COALESCE((p_order->>'processing_fee')::NUMERIC, 0),
        p_order->>'delivery_zone', p_order->>'delivery_type', p_order->'delivery_discount',
        COALESCE((p_order->>'delivery_fee')::NUMERIC, 0), COALESCE((p_order->>'packaging_fee')::NUMERIC, 0),
        COALESCE((p_order->>'prep_fee')::NUMERIC, 0), p_order->>'prep_instructions',
        NULLIF(p_order->>'requested_delivery_date', '')::DATE, p_order->>'requested_delivery_slot',
        NULLIF(p_order->>'subscription_id', '')::UUID,
        COALESCE((p_order->>'created_at')::TIMESTAMPTZ, now())
    );

    v_coupon_code := p_order->>'coupon_code';
    IF v_coupon_code IS NOT NULL AND v_coupon_code <> '' THEN
        UPDATE coupons SET usage_count = COALESCE(usage_count, 0) + 1
         WHERE UPPER(code) = UPPER(v_coupon_code);
    END IF;

    RETURN jsonb_build_object('ok', true, 'order_id', p_order->>'id');
END;
$$ LANGUAGE plpgsql;

-- ── 3. Re-create restore_stock_for_order_atomic with NUMERIC ──
CREATE OR REPLACE FUNCTION restore_stock_for_order_atomic(
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item               JSONB;
    v_product_id         UUID;
    v_variant_name       TEXT;
    v_inventory_id       UUID;
    v_quantity           NUMERIC;          -- ← was INT
    v_variants           JSONB;
    v_variant_idx        INT;
    v_current_stock      NUMERIC;          -- ← was INT
    v_updated_variants   JSONB;
    v_restored           INT := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id   := (v_item->>'product_id')::UUID;
        v_variant_name := v_item->>'variant_name';
        v_inventory_id := NULLIF(v_item->>'inventory_item_id', '')::UUID;
        v_quantity     := (v_item->>'quantity')::NUMERIC;

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

            v_current_stock := COALESCE((v_variants->v_variant_idx->>'stock')::NUMERIC, 0);
            v_updated_variants := jsonb_set(
                v_variants, ARRAY[v_variant_idx::text, 'stock'],
                to_jsonb(v_current_stock + v_quantity)
            );
            UPDATE products
               SET variants = v_updated_variants,
                   stock = (SELECT COALESCE(SUM((e->>'stock')::NUMERIC), 0)
                              FROM jsonb_array_elements(v_updated_variants) AS e)
             WHERE id = v_product_id;
            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, v_quantity, 'restore_variant_' || v_variant_name || '_payment_failed');
            v_restored := v_restored + 1;
        ELSIF v_inventory_id IS NOT NULL THEN
            UPDATE inventory_items SET stock = COALESCE(stock, 0) + v_quantity, updated_at = now()
             WHERE id = v_inventory_id;
            INSERT INTO inventory_logs (product_id, change_amount, reason)
            VALUES (v_product_id, v_quantity, 'restore_main_payment_failed');
            v_restored := v_restored + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('restored', v_restored);
END;
$$ LANGUAGE plpgsql;
