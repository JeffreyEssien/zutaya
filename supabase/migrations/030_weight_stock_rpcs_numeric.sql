-- ════════════════════════════════════════════════════════════════════
--  Migration 030 — NUMERIC-ify the remaining stock RPCs
--
--  Migration 029 made the ATOMIC order/restore path weight-safe. This finishes
--  the job for the legacy NON-atomic restore RPCs (`restore_stock`,
--  `restore_variant_stock`) so any code path that still calls them restores
--  fractional kg exactly instead of truncating.
--
--  Note: `deduct_variant_stock` / `deduct_stock` are NOT touched here — they are
--  superseded by `create_order_atomic` (the only live deduction path, already
--  NUMERIC via 029) and are no longer called from the app. (`deduct_variant_stock`
--  is also re-defined by the later-sorting 20260316 migration on a fresh rebuild,
--  so changing it here would be undone anyway.)
-- ════════════════════════════════════════════════════════════════════

-- Inventory restore — quantity becomes NUMERIC (stock column is NUMERIC via 029).
CREATE OR REPLACE FUNCTION restore_stock(
    p_inventory_id UUID,
    p_quantity NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE inventory_items
       SET stock = COALESCE(stock, 0) + p_quantity,
           updated_at = now()
     WHERE id = p_inventory_id;
END;
$$ LANGUAGE plpgsql;

-- Variant restore — quantity + working stock become NUMERIC so 0.5 kg restores
-- land exactly back in the variant's JSONB stock.
CREATE OR REPLACE FUNCTION restore_variant_stock(
    p_product_id UUID,
    p_variant_name TEXT,
    p_quantity NUMERIC
) RETURNS VOID AS $$
DECLARE
    v_variants JSONB;
    v_variant_idx INT;
    v_current_stock NUMERIC;
    v_updated_variants JSONB;
BEGIN
    SELECT variants INTO v_variants FROM products WHERE id = p_product_id FOR UPDATE;
    IF v_variants IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    IF jsonb_typeof(v_variants) = 'string' THEN
        v_variants := (v_variants #>> '{}')::jsonb;
    END IF;

    SELECT idx - 1 INTO v_variant_idx
    FROM jsonb_array_elements(v_variants) WITH ORDINALITY arr(elem, idx)
    WHERE elem->>'name' = p_variant_name
    LIMIT 1;

    IF v_variant_idx IS NULL THEN
        RAISE EXCEPTION 'Variant "%" not found on product %', p_variant_name, p_product_id;
    END IF;

    v_current_stock := COALESCE((v_variants->v_variant_idx->>'stock')::NUMERIC, 0);

    v_updated_variants := jsonb_set(
        v_variants,
        ARRAY[v_variant_idx::text, 'stock'],
        to_jsonb(v_current_stock + p_quantity)
    );

    UPDATE products SET variants = v_updated_variants WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
