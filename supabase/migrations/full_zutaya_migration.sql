-- ==============================================
-- ZÚTA YA — Full Migration
-- Run this in the Supabase SQL Editor
-- Idempotent: safe to run on existing or fresh DB
-- ==============================================

-- ██████████████████████████████████████████████
-- 1. CORE TABLES (create if not exist)
-- ██████████████████████████████████████████████

-- 1a. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  description TEXT,
  sort_order INT DEFAULT 0
);

-- 1b. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  brand TEXT DEFAULT 'Zúta Ya',
  stock INT DEFAULT 0,
  images TEXT[] NOT NULL DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  inventory_item_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Meat commerce fields
  category_id UUID REFERENCES categories(id),
  price_unit TEXT DEFAULT 'per_kg' CHECK (price_unit IN ('per_kg','per_pack','per_piece','whole')),
  cut_type TEXT,
  storage_type TEXT DEFAULT 'fresh' CHECK (storage_type IN ('fresh','chilled','frozen')),
  prep_options JSONB DEFAULT '[]',
  min_weight_kg NUMERIC(10,3),
  related_recipe_ids UUID[] DEFAULT '{}'
);

-- 1c. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  stock NUMERIC(10,3) DEFAULT 0,
  reorder_level INT DEFAULT 5,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Meat commerce fields
  stock_unit TEXT DEFAULT 'units',
  batch_number TEXT,
  expiry_date DATE,
  storage_type TEXT CHECK (storage_type IS NULL OR storage_type IN ('fresh','chilled','frozen'))
);

-- 1d. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','packed','out_for_delivery','delivered')),
  shipping_address JSONB NOT NULL,
  notes TEXT,
  coupon_code TEXT,
  discount_total NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT,
  sender_name TEXT,
  payment_status TEXT DEFAULT 'pending',
  delivery_zone TEXT,
  delivery_type TEXT,
  delivery_discount JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Meat commerce fields
  packaging_fee NUMERIC(10,2) DEFAULT 0,
  prep_fee NUMERIC(10,2) DEFAULT 0,
  prep_instructions TEXT,
  requested_delivery_date DATE,
  requested_delivery_slot TEXT CHECK (requested_delivery_slot IS NULL OR requested_delivery_slot IN ('morning','afternoon','evening')),
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  subscription_id UUID
);

-- 1e. Site Settings (Singleton)
CREATE TABLE IF NOT EXISTS site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  site_name TEXT DEFAULT 'Zúta Ya',
  logo_url TEXT,
  hero_heading TEXT,
  hero_subheading TEXT,
  hero_image TEXT,
  hero_cta_text TEXT,
  hero_cta_link TEXT,
  favicon_url TEXT,
  our_story_heading TEXT,
  our_story_text TEXT,
  why_xelle_heading TEXT,
  why_xelle_features TEXT,
  announcement_bar_enabled BOOLEAN DEFAULT FALSE,
  announcement_bar_text TEXT,
  announcement_bar_color TEXT DEFAULT '#C0392B',
  social_instagram TEXT,
  social_twitter TEXT,
  social_tiktok TEXT,
  social_facebook TEXT,
  business_phone TEXT,
  business_whatsapp TEXT,
  business_address TEXT,
  footer_tagline TEXT,
  free_shipping_threshold NUMERIC(10,2) DEFAULT 50000,
  packaging_fee NUMERIC(10,2) DEFAULT 500,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1f. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1g. CMS Pages
CREATE TABLE IF NOT EXISTS pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1h. Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  change_amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1i. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  max_uses INT,
  expires_at TIMESTAMPTZ,
  min_order_amount NUMERIC(10,2)
);

-- 1j. Delivery Zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('lagos', 'interstate')),
  base_fee NUMERIC(10,2),
  allows_hub_pickup BOOLEAN DEFAULT FALSE,
  hub_estimate TEXT,
  doorstep_estimate TEXT,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1k. Delivery Locations
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES delivery_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hub_pickup_fee NUMERIC(10,2),
  doorstep_fee NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1l. Stockpiles
CREATE TABLE IF NOT EXISTS stockpiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'shipped', 'expired', 'cancelled')),
  shipping_address JSONB,
  delivery_zone TEXT,
  delivery_type TEXT,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  total_items_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  shipped_at TIMESTAMPTZ
);

-- 1m. Stockpile Items
CREATE TABLE IF NOT EXISTS stockpile_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stockpile_id UUID REFERENCES stockpiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  variant_name TEXT,
  quantity INT NOT NULL DEFAULT 1,
  price_paid NUMERIC(10,2) NOT NULL,
  order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ██████████████████████████████████████████████
-- 2. NEW TABLES (Meat Commerce / Spec Sections 6-9)
-- ██████████████████████████████████████████████

-- 2a. Recipes
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

-- 2b. Newsletter Subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  source TEXT DEFAULT 'footer',
  token TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

-- 2c. Newsletter Campaigns
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sending','sent')),
  sent_at TIMESTAMPTZ,
  recipient_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2d. Bundle Rules
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

-- 2e. Subscriptions (Recurring Orders)
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

-- 2f. Delivery Capacity (slot management)
CREATE TABLE IF NOT EXISTS delivery_capacity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('morning','afternoon','evening')),
  max_orders INT NOT NULL DEFAULT 20,
  booked_count INT NOT NULL DEFAULT 0,
  is_available BOOLEAN GENERATED ALWAYS AS (booked_count < max_orders) STORED,
  UNIQUE(delivery_date, slot)
);


-- ██████████████████████████████████████████████
-- 3. ALTER EXISTING TABLES (add missing columns)
--    Uses DO blocks so it's safe to re-run
-- ██████████████████████████████████████████████

DO $$ BEGIN
  -- Products: add meat fields if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category_id') THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
  END IF;
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

  -- Orders: add meat commerce fields if missing
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

  -- Inventory Items: add meat fields if missing
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

  -- Coupons: add extension fields if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='max_uses') THEN
    ALTER TABLE coupons ADD COLUMN max_uses INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='expires_at') THEN
    ALTER TABLE coupons ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='min_order_amount') THEN
    ALTER TABLE coupons ADD COLUMN min_order_amount NUMERIC(10,2);
  END IF;

  -- Categories: add sort_order if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='sort_order') THEN
    ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0;
  END IF;

  -- Site Settings: add packaging_fee if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='packaging_fee') THEN
    ALTER TABLE site_settings ADD COLUMN packaging_fee NUMERIC(10,2) DEFAULT 500;
  END IF;

  -- Change inventory_items.stock from INT to NUMERIC if it's currently INT
  -- (This is safe — NUMERIC is a superset of INT)
  ALTER TABLE inventory_items ALTER COLUMN stock TYPE NUMERIC(10,3) USING stock::NUMERIC(10,3);

END $$;

-- Fix orders status constraint (expand from 3-stage to 5-stage)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','processing','packed','out_for_delivery','delivered'));


-- ██████████████████████████████████████████████
-- 4. INDEXES
-- ██████████████████████████████████████████████

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(requested_delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_zone ON delivery_locations(zone_id);
CREATE INDEX IF NOT EXISTS idx_stockpile_items_stockpile ON stockpile_items(stockpile_id);
CREATE INDEX IF NOT EXISTS idx_stockpiles_email ON stockpiles(customer_email);
CREATE INDEX IF NOT EXISTS idx_stockpiles_status ON stockpiles(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_storage_type ON products(storage_type);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next ON subscriptions(next_order_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(email) WHERE unsubscribed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_capacity_date ON delivery_capacity(delivery_date);


-- ██████████████████████████████████████████████
-- 5. ROW LEVEL SECURITY
-- ██████████████████████████████████████████████

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockpiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockpile_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_capacity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe: IF EXISTS)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Public read policies
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public read published pages" ON pages FOR SELECT USING (is_published = true);
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Public read delivery_zones" ON delivery_zones FOR SELECT USING (true);
CREATE POLICY "Public read delivery_locations" ON delivery_locations FOR SELECT USING (true);
CREATE POLICY "Public read recipes" ON recipes FOR SELECT USING (is_published = true);
CREATE POLICY "Public read bundle_rules" ON bundle_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Public read delivery_capacity" ON delivery_capacity FOR SELECT USING (true);

-- Orders: public insert + read/update via service role
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Service update orders" ON orders FOR UPDATE USING (true);

-- Profiles
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Admin full access (service_role bypasses RLS, these are for anon/user access)
CREATE POLICY "Admin all inventory_items" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Admin read inventory_logs" ON inventory_logs FOR SELECT USING (true);
CREATE POLICY "Public insert inventory_logs" ON inventory_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all pages" ON pages FOR ALL USING (true);
CREATE POLICY "Admin all coupons" ON coupons FOR ALL USING (true);
CREATE POLICY "Admin all delivery_zones" ON delivery_zones FOR ALL USING (true);
CREATE POLICY "Admin all delivery_locations" ON delivery_locations FOR ALL USING (true);
CREATE POLICY "Admin insert site_settings" ON site_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update site_settings" ON site_settings FOR UPDATE USING (true);
CREATE POLICY "Admin all categories" ON categories FOR ALL USING (true);
CREATE POLICY "Admin all products" ON products FOR ALL USING (true);

-- Stockpiles
CREATE POLICY "Public insert stockpiles" ON stockpiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read stockpiles" ON stockpiles FOR SELECT USING (true);
CREATE POLICY "Service update stockpiles" ON stockpiles FOR UPDATE USING (true);
CREATE POLICY "Admin delete stockpiles" ON stockpiles FOR DELETE USING (true);
CREATE POLICY "Public insert stockpile_items" ON stockpile_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read stockpile_items" ON stockpile_items FOR SELECT USING (true);
CREATE POLICY "Service update stockpile_items" ON stockpile_items FOR UPDATE USING (true);
CREATE POLICY "Admin delete stockpile_items" ON stockpile_items FOR DELETE USING (true);

-- New tables: full access (admin uses service_role which bypasses RLS)
CREATE POLICY "Admin all recipes" ON recipes FOR ALL USING (true);
CREATE POLICY "Admin all newsletter_subscribers" ON newsletter_subscribers FOR ALL USING (true);
CREATE POLICY "Admin all newsletter_campaigns" ON newsletter_campaigns FOR ALL USING (true);
CREATE POLICY "Admin all bundle_rules" ON bundle_rules FOR ALL USING (true);
CREATE POLICY "Admin all subscriptions" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Admin all delivery_capacity" ON delivery_capacity FOR ALL USING (true);

-- Newsletter: public insert (subscribe)
CREATE POLICY "Public insert newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
-- Subscriptions: public insert
CREATE POLICY "Public insert subscriptions" ON subscriptions FOR INSERT WITH CHECK (true);


-- ██████████████████████████████████████████████
-- 6. FUNCTIONS & TRIGGERS
-- ██████████████████████████████████████████████

-- 6a. Profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6b. Category name sync trigger (keep products.category in sync when category name changes)
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

-- 6c. Atomic stock deduction (NUMERIC quantity for kg support)
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

-- 6d. Variant stock deduction
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

-- 6e. Increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE UPPER(code) = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6f. Check coupon validity
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

-- 6g. Increment delivery capacity (book a slot)
CREATE OR REPLACE FUNCTION increment_delivery_capacity(
  p_date DATE, p_slot TEXT
) RETURNS VOID AS $$
DECLARE v_max INT; v_booked INT;
BEGIN
  SELECT max_orders, booked_count INTO v_max, v_booked
  FROM delivery_capacity WHERE delivery_date = p_date AND slot = p_slot FOR UPDATE;
  IF NOT FOUND THEN
    -- Auto-create capacity row with defaults if it doesn't exist
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


-- ██████████████████████████████████████████████
-- 7. SEED DATA
-- ██████████████████████████████████████████████

-- Seed default site settings if not exists
INSERT INTO site_settings (id, site_name, business_phone, business_whatsapp, social_instagram, footer_tagline, announcement_bar_color)
VALUES (true, 'Zúta Ya', '07042038491', '2347042038491', '@zuutaya', 'Premium Meat Delivery · Lagos', '#C0392B')
ON CONFLICT (id) DO NOTHING;

-- Seed Lagos delivery zone
INSERT INTO delivery_zones (name, zone_type, base_fee, is_active, sort_order)
VALUES ('Lagos', 'lagos', 0, true, 1)
ON CONFLICT DO NOTHING;

-- Seed default delivery capacity for next 7 days (20 slots each)
INSERT INTO delivery_capacity (delivery_date, slot, max_orders)
SELECT d::date, s, 20
FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 7, '1 day'::interval) d
CROSS JOIN unnest(ARRAY['morning','afternoon','evening']) s
ON CONFLICT (delivery_date, slot) DO NOTHING;


-- ██████████████████████████████████████████████
-- DONE
-- ██████████████████████████████████████████████
