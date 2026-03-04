-- ===================================================
-- Stockpile Feature: Pay now, ship later (max 2 weeks)
-- Run this in Supabase SQL Editor
-- ===================================================

-- Stockpiles: one per customer session
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

-- Stockpile items: individual paid items held for later shipping
CREATE TABLE IF NOT EXISTS stockpile_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stockpile_id UUID REFERENCES stockpiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  variant_name TEXT,
  quantity INT NOT NULL DEFAULT 1,
  price_paid NUMERIC(10,2) NOT NULL,
  order_id TEXT, -- Reference to original order
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
