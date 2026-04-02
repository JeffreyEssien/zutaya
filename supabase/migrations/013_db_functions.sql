-- 013: Create/replace all DB functions and triggers

-- Atomic stock deduction (NUMERIC quantity for kg support)
CREATE OR REPLACE FUNCTION deduct_stock(
  p_inventory_id UUID,
  p_quantity NUMERIC,
  p_unit TEXT DEFAULT 'kg'
) RETURNS NUMERIC AS $$
DECLARE v_current NUMERIC;
BEGIN
  SELECT stock INTO v_current FROM inventory_items WHERE id = p_inventory_id FOR UPDATE;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_id;
  END IF;
  IF v_current < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current, p_quantity;
  END IF;
  UPDATE inventory_items SET stock = stock - p_quantity, updated_at = now() WHERE id = p_inventory_id;
  RETURN v_current - p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Variant stock deduction
CREATE OR REPLACE FUNCTION deduct_variant_stock(
  p_product_id UUID,
  p_variant_name TEXT,
  p_quantity INT
) RETURNS JSONB AS $$
DECLARE
  v_product_row RECORD;
  v_variants JSONB;
  v_variant_idx INT;
  v_current_stock INT;
  v_updated_variants JSONB;
BEGIN
  SELECT * INTO v_product_row FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
  v_variants := COALESCE(v_product_row.variants, '[]'::jsonb);
  SELECT idx - 1 INTO v_variant_idx
  FROM jsonb_array_elements(v_variants) WITH ORDINALITY arr(elem, idx)
  WHERE elem->>'name' = p_variant_name LIMIT 1;
  IF v_variant_idx IS NULL THEN
    RAISE EXCEPTION 'Variant "%" not found on product %', p_variant_name, p_product_id;
  END IF;
  v_current_stock := COALESCE((v_variants->v_variant_idx->>'stock')::INT, 0);
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for variant "%". Available: %, Requested: %', p_variant_name, v_current_stock, p_quantity;
  END IF;
  v_updated_variants := jsonb_set(v_variants, ARRAY[v_variant_idx::text, 'stock'], to_jsonb(v_current_stock - p_quantity));
  UPDATE products SET variants = v_updated_variants,
    stock = (SELECT COALESCE(SUM((elem->>'stock')::int), 0) FROM jsonb_array_elements(v_updated_variants) AS elem)
  WHERE id = p_product_id;
  RETURN v_updated_variants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE UPPER(code) = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check coupon validity
CREATE OR REPLACE FUNCTION check_coupon_validity(p_code TEXT)
RETURNS TABLE(id UUID, code TEXT, discount_percent NUMERIC, max_uses INT, usage_count INT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.code, c.discount_percent, c.max_uses, c.usage_count FROM coupons c
  WHERE UPPER(c.code) = UPPER(p_code)
    AND c.is_active = TRUE
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND (c.max_uses IS NULL OR c.usage_count < c.max_uses);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment delivery capacity (book a slot)
CREATE OR REPLACE FUNCTION increment_delivery_capacity(
  p_date DATE, p_slot TEXT
) RETURNS VOID AS $$
DECLARE v_max INT; v_booked INT;
BEGIN
  SELECT max_orders, booked_count INTO v_max, v_booked
  FROM delivery_capacity WHERE delivery_date = p_date AND slot = p_slot FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO delivery_capacity (delivery_date, slot, max_orders, booked_count)
    VALUES (p_date, p_slot, 20, 1);
    RETURN;
  END IF;
  IF v_booked >= v_max THEN
    RAISE EXCEPTION 'Delivery slot % on % is fully booked', p_slot, p_date;
  END IF;
  UPDATE delivery_capacity SET booked_count = booked_count + 1
  WHERE delivery_date = p_date AND slot = p_slot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
