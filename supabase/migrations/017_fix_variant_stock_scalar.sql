-- Fix deduct_variant_stock to handle variants stored as JSON string scalar
CREATE OR REPLACE FUNCTION deduct_variant_stock(
  p_product_id UUID,
  p_variant_name TEXT,
  p_quantity INT
)
RETURNS JSONB AS $$
DECLARE
  v_product_row RECORD;
  v_variants JSONB;
  v_variant_idx INT;
  v_current_stock INT;
  v_updated_variants JSONB;
BEGIN
  -- Lock the product row
  SELECT * INTO v_product_row
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  v_variants := COALESCE(v_product_row.variants, '[]'::jsonb);

  -- Handle case where variants is stored as a JSON string instead of array
  IF jsonb_typeof(v_variants) = 'string' THEN
    v_variants := (v_variants #>> '{}')::jsonb;
  END IF;

  -- Find the index of the specific variant
  SELECT idx - 1 INTO v_variant_idx
  FROM jsonb_array_elements(v_variants) WITH ORDINALITY arr(elem, idx)
  WHERE elem->>'name' = p_variant_name
  LIMIT 1;

  IF v_variant_idx IS NULL THEN
    RAISE EXCEPTION 'Variant "%" not found on product %', p_variant_name, p_product_id;
  END IF;

  -- Get current stock
  v_current_stock := (v_variants->v_variant_idx->>'stock')::INT;

  IF v_current_stock IS NULL THEN
     v_current_stock := 0;
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for variant "%". Available: %, Requested: %', p_variant_name, v_current_stock, p_quantity;
  END IF;

  -- Build the updated variants array
  v_updated_variants := jsonb_set(
    v_variants,
    ARRAY[v_variant_idx::text, 'stock'],
    to_jsonb(v_current_stock - p_quantity)
  );

  -- Update the product (variants + recalculate total stock)
  UPDATE products
  SET variants = v_updated_variants,
      stock = (
        SELECT COALESCE(SUM((elem->>'stock')::int), 0)
        FROM jsonb_array_elements(v_updated_variants) AS elem
      )
  WHERE id = p_product_id;

  RETURN v_updated_variants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix any existing products where variants is a string scalar
UPDATE products
SET variants = (variants #>> '{}')::jsonb
WHERE jsonb_typeof(variants) = 'string';
