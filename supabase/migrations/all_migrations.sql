-- ==============================================
-- ZUTA YA — All Migrations (001-014) Combined
-- Safe to run in Supabase SQL Editor in one go
-- ==============================================

-- ============================================
-- 001: Add category_id UUID FK to products
-- ============================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

UPDATE products p SET category_id = c.id
  FROM categories c WHERE p.category = c.name
  AND p.category_id IS NULL;

CREATE OR REPLACE FUNCTION sync_product_category_text()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET category = NEW.name WHERE category_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_name_change ON categories;
CREATE TRIGGER trg_category_name_change
  AFTER UPDATE OF name ON categories
  FOR EACH ROW EXECUTE FUNCTION sync_product_category_text();

-- ============================================
-- 002: Product meat fields
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price_unit') THEN
    ALTER TABLE products ADD COLUMN price_unit TEXT DEFAULT 'per_kg' CHECK (price_unit IN ('per_kg','per_pack','per_piece','whole'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cut_type') THEN
    ALTER TABLE products ADD COLUMN cut_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='storage_type') THEN
    ALTER TABLE products ADD COLUMN storage_type TEXT DEFAULT 'fresh' CHECK (storage_type IN ('fresh','chilled','frozen'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='prep_options') THEN
    ALTER TABLE products ADD COLUMN prep_options JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_weight_kg') THEN
    ALTER TABLE products ADD COLUMN min_weight_kg NUMERIC(10,3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='related_recipe_ids') THEN
    ALTER TABLE products ADD COLUMN related_recipe_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- 003: Order meat fields
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='packaging_fee') THEN
    ALTER TABLE orders ADD COLUMN packaging_fee NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='prep_fee') THEN
    ALTER TABLE orders ADD COLUMN prep_fee NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='prep_instructions') THEN
    ALTER TABLE orders ADD COLUMN prep_instructions TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='requested_delivery_date') THEN
    ALTER TABLE orders ADD COLUMN requested_delivery_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='requested_delivery_slot') THEN
    ALTER TABLE orders ADD COLUMN requested_delivery_slot TEXT CHECK (requested_delivery_slot IS NULL OR requested_delivery_slot IN ('morning','afternoon','evening'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_fee') THEN
    ALTER TABLE orders ADD COLUMN delivery_fee NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='subscription_id') THEN
    ALTER TABLE orders ADD COLUMN subscription_id UUID;
  END IF;
END $$;

-- ============================================
-- 004: Expand order status to 5-stage
-- ============================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','processing','packed','out_for_delivery','delivered'));

-- ============================================
-- 005: Inventory meat fields
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='stock_unit') THEN
    ALTER TABLE inventory_items ADD COLUMN stock_unit TEXT DEFAULT 'units';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='batch_number') THEN
    ALTER TABLE inventory_items ADD COLUMN batch_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='expiry_date') THEN
    ALTER TABLE inventory_items ADD COLUMN expiry_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='storage_type') THEN
    ALTER TABLE inventory_items ADD COLUMN storage_type TEXT CHECK (storage_type IS NULL OR storage_type IN ('fresh','chilled','frozen'));
  END IF;
  ALTER TABLE inventory_items ALTER COLUMN stock TYPE NUMERIC(10,3) USING stock::NUMERIC(10,3);
END $$;

-- ============================================
-- 006: Recipes table
-- ============================================

CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content JSONB,
  cover_image TEXT,
  ingredient_product_ids UUID[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recipes' AND policyname='Public read recipes') THEN
    CREATE POLICY "Public read recipes" ON recipes FOR SELECT USING (is_published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recipes' AND policyname='Admin all recipes') THEN
    CREATE POLICY "Admin all recipes" ON recipes FOR ALL USING (true);
  END IF;
END $$;

-- ============================================
-- 007: Newsletter tables
-- ============================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  source TEXT DEFAULT 'footer',
  token TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sending','sent')),
  sent_at TIMESTAMPTZ,
  recipient_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='newsletter_subscribers' AND policyname='Public insert newsletter') THEN
    CREATE POLICY "Public insert newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='newsletter_subscribers' AND policyname='Admin all newsletter_subscribers') THEN
    CREATE POLICY "Admin all newsletter_subscribers" ON newsletter_subscribers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='newsletter_campaigns' AND policyname='Admin all newsletter_campaigns') THEN
    CREATE POLICY "Admin all newsletter_campaigns" ON newsletter_campaigns FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(email) WHERE unsubscribed_at IS NULL;

-- ============================================
-- 008: Bundle rules table
-- ============================================

CREATE TABLE IF NOT EXISTS bundle_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  min_items INT NOT NULL DEFAULT 3,
  max_items INT NOT NULL DEFAULT 10,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  allowed_category_ids UUID[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bundle_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bundle_rules' AND policyname='Public read bundle_rules') THEN
    CREATE POLICY "Public read bundle_rules" ON bundle_rules FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bundle_rules' AND policyname='Admin all bundle_rules') THEN
    CREATE POLICY "Admin all bundle_rules" ON bundle_rules FOR ALL USING (true);
  END IF;
END $$;

-- ============================================
-- 009: Subscriptions table
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly')),
  delivery_address JSONB,
  delivery_zone TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  next_order_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Public insert subscriptions') THEN
    CREATE POLICY "Public insert subscriptions" ON subscriptions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Admin all subscriptions') THEN
    CREATE POLICY "Admin all subscriptions" ON subscriptions FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_next ON subscriptions(next_order_date) WHERE status = 'active';

-- ============================================
-- 010: Delivery capacity table
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_capacity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('morning','afternoon','evening')),
  max_orders INT NOT NULL DEFAULT 20,
  booked_count INT NOT NULL DEFAULT 0,
  is_available BOOLEAN GENERATED ALWAYS AS (booked_count < max_orders) STORED,
  UNIQUE(delivery_date, slot)
);

ALTER TABLE delivery_capacity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_capacity' AND policyname='Public read delivery_capacity') THEN
    CREATE POLICY "Public read delivery_capacity" ON delivery_capacity FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_capacity' AND policyname='Admin all delivery_capacity') THEN
    CREATE POLICY "Admin all delivery_capacity" ON delivery_capacity FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_delivery_capacity_date ON delivery_capacity(delivery_date);

INSERT INTO delivery_capacity (delivery_date, slot, max_orders)
SELECT d::date, s, 20
FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 7, '1 day'::interval) d
CROSS JOIN unnest(ARRAY['morning','afternoon','evening']) s
ON CONFLICT (delivery_date, slot) DO NOTHING;

-- ============================================
-- 011: Coupon extensions
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='max_uses') THEN
    ALTER TABLE coupons ADD COLUMN max_uses INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='expires_at') THEN
    ALTER TABLE coupons ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='min_order_amount') THEN
    ALTER TABLE coupons ADD COLUMN min_order_amount NUMERIC(10,2);
  END IF;
END $$;

-- ============================================
-- 012: Category sort_order
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='sort_order') THEN
    ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 013: DB functions
-- ============================================

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

CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE UPPER(code) = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ============================================
-- Additional indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(requested_delivery_date);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_storage_type ON products(storage_type);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory_items(expiry_date);

-- ==============================================
-- DONE — All 14 migrations applied
-- ==============================================
