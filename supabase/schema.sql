-- ==============================================
-- XELLÉ Complete Database Schema (Source of Truth)
-- Use this to recreate the entire database from scratch
-- Last updated: 2026-02-19
-- ==============================================

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image TEXT NOT NULL,
  description TEXT
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  brand TEXT DEFAULT 'XELLÉ',
  stock INT DEFAULT 0,
  images TEXT[] NOT NULL,
  variants JSONB DEFAULT '[]',
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  inventory_item_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'delivered')),
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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- 4. Site Settings (Singleton)
CREATE TABLE IF NOT EXISTS site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  site_name TEXT DEFAULT 'XELLÉ',
  logo_url TEXT,
  hero_heading TEXT,
  hero_subheading TEXT,
  hero_image TEXT,
  hero_cta_text TEXT,
  hero_cta_link TEXT,
  -- Favicon & content
  favicon_url TEXT,
  our_story_heading TEXT,
  our_story_text TEXT,
  why_xelle_heading TEXT,
  why_xelle_features TEXT,
  -- Announcement bar
  announcement_bar_enabled BOOLEAN DEFAULT FALSE,
  announcement_bar_text TEXT,
  announcement_bar_color TEXT DEFAULT '#B665D2',
  -- Social links
  social_instagram TEXT,
  social_twitter TEXT,
  social_tiktok TEXT,
  social_facebook TEXT,
  -- Business contact
  business_phone TEXT,
  business_whatsapp TEXT,
  business_address TEXT,
  -- About page
  about_promise_text TEXT,
  about_quote TEXT,
  about_stats TEXT,
  -- Footer
  footer_tagline TEXT,
  -- Shipping
  free_shipping_threshold NUMERIC(10,2) DEFAULT 50000,
  -- All editable texts
  custom_texts JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. CMS Pages
CREATE TABLE IF NOT EXISTS pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  change_amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  stock INT DEFAULT 0,
  reorder_level INT DEFAULT 5,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from products to inventory_items
ALTER TABLE products
  ADD CONSTRAINT fk_products_inventory
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

-- Add FK from inventory_logs to inventory_items
ALTER TABLE inventory_logs
  ADD CONSTRAINT fk_inventory_logs_item
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

-- 9. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Delivery Zones
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

-- 11. Delivery Locations
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES delivery_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hub_pickup_fee NUMERIC(10,2),
  doorstep_fee NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_locations_zone ON delivery_locations(zone_id);

-- ==============================================
-- Row Level Security
-- ==============================================

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

-- Public read
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public read published pages" ON pages FOR SELECT USING (is_published = true);
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Public read delivery_zones" ON delivery_zones FOR SELECT USING (true);
CREATE POLICY "Public read delivery_locations" ON delivery_locations FOR SELECT USING (true);

-- Orders: public insert (customers place orders), service read/update
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Service update orders" ON orders FOR UPDATE USING (true);

-- Admin full access (open for now — restrict with role checks when auth is added)
CREATE POLICY "Admin full access inventory_items" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Admin read inventory_logs" ON inventory_logs FOR SELECT USING (true);
CREATE POLICY "Public insert inventory_logs" ON inventory_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all pages" ON pages FOR ALL USING (true);
CREATE POLICY "Admin manage coupons" ON coupons FOR ALL USING (true);
CREATE POLICY "Admin manage delivery_zones" ON delivery_zones FOR ALL USING (true);
CREATE POLICY "Admin manage delivery_locations" ON delivery_locations FOR ALL USING (true);
CREATE POLICY "Admin insert site_settings" ON site_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update site_settings" ON site_settings FOR UPDATE USING (true);

-- Profiles
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ==============================================
-- Functions / RPCs
-- ==============================================

-- Atomic stock deduction (prevents race conditions)
CREATE OR REPLACE FUNCTION deduct_stock(
  p_inventory_id UUID,
  p_quantity INT
)
RETURNS INT AS $$
DECLARE
  v_current_stock INT;
BEGIN
  SELECT stock INTO v_current_stock
  FROM inventory_items
  WHERE id = p_inventory_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_id;
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
  END IF;

  UPDATE inventory_items
  SET stock = stock - p_quantity,
      updated_at = now()
  WHERE id = p_inventory_id;

  RETURN v_current_stock - p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Stockpiles (Pay now, ship later)
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

-- 13. Stockpile Items
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

CREATE INDEX IF NOT EXISTS idx_stockpile_items_stockpile ON stockpile_items(stockpile_id);
CREATE INDEX IF NOT EXISTS idx_stockpiles_email ON stockpiles(customer_email);
CREATE INDEX IF NOT EXISTS idx_stockpiles_status ON stockpiles(status);

-- RLS
ALTER TABLE stockpiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockpile_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert stockpiles" ON stockpiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read own stockpiles" ON stockpiles FOR SELECT USING (true);
CREATE POLICY "Service update stockpiles" ON stockpiles FOR UPDATE USING (true);
CREATE POLICY "Admin delete stockpiles" ON stockpiles FOR DELETE USING (true);

CREATE POLICY "Public insert stockpile_items" ON stockpile_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read stockpile_items" ON stockpile_items FOR SELECT USING (true);
CREATE POLICY "Service update stockpile_items" ON stockpile_items FOR UPDATE USING (true);
CREATE POLICY "Admin delete stockpile_items" ON stockpile_items FOR DELETE USING (true);

-- Atomic variant stock deduction
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
     v_current_stock := 0; -- Default if not properly set
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

  -- Update the product (variants + recalculate total stock as sum of all variant stocks)
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
