-- 010: Create delivery_capacity table with generated is_available column

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
CREATE POLICY "Public read delivery_capacity" ON delivery_capacity FOR SELECT USING (true);
CREATE POLICY "Admin all delivery_capacity" ON delivery_capacity FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_delivery_capacity_date ON delivery_capacity(delivery_date);

-- Seed default capacity for next 7 days
INSERT INTO delivery_capacity (delivery_date, slot, max_orders)
SELECT d::date, s, 20
FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 7, '1 day'::interval) d
CROSS JOIN unnest(ARRAY['morning','afternoon','evening']) s
ON CONFLICT (delivery_date, slot) DO NOTHING;
