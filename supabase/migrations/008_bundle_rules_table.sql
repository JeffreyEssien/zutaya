-- 008: Create bundle_rules table

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
CREATE POLICY "Public read bundle_rules" ON bundle_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admin all bundle_rules" ON bundle_rules FOR ALL USING (true);
