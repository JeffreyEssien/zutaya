-- ════════════════════════════════════════════════════════════════════
--  Migration 024 — Payment recovery: reconciliation, stock restore,
--                  resume tokens.
--
--  Run AFTER migration 023.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. payments: add recovery columns ──
ALTER TABLE payments ADD COLUMN IF NOT EXISTS resume_token TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stock_restored_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS resume_email_sent_at TIMESTAMPTZ;

-- Hot-path index for the reconcile cron
CREATE INDEX IF NOT EXISTS idx_payments_pending_created
    ON payments(created_at) WHERE status = 'pending';

-- Lookup-by-token index
CREATE INDEX IF NOT EXISTS idx_payments_resume_token ON payments(resume_token);

-- ── 2. Stock restore RPCs (mirror of deduct_*) ──

-- Restore variant stock (inverse of deduct_variant_stock)
CREATE OR REPLACE FUNCTION restore_variant_stock(
    p_product_id UUID,
    p_variant_name TEXT,
    p_quantity INT
) RETURNS VOID AS $$
DECLARE
    v_variants JSONB;
    v_variant_idx INT;
    v_current_stock INT;
    v_updated_variants JSONB;
BEGIN
    SELECT variants INTO v_variants FROM products WHERE id = p_product_id FOR UPDATE;
    IF v_variants IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    -- Defensive: variants might be stored as JSON string
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

    v_current_stock := COALESCE((v_variants->v_variant_idx->>'stock')::INT, 0);

    v_updated_variants := jsonb_set(
        v_variants,
        ARRAY[v_variant_idx::text, 'stock'],
        to_jsonb(v_current_stock + p_quantity)
    );

    UPDATE products SET variants = v_updated_variants WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Restore main-inventory stock (inverse of deduct_stock)
CREATE OR REPLACE FUNCTION restore_stock(
    p_inventory_id UUID,
    p_quantity INT
) RETURNS VOID AS $$
BEGIN
    UPDATE inventory_items
       SET stock = COALESCE(stock, 0) + p_quantity,
           updated_at = now()
     WHERE id = p_inventory_id;
END;
$$ LANGUAGE plpgsql;
