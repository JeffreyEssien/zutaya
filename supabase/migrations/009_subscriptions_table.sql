-- 009: Create subscriptions table

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
CREATE POLICY "Public insert subscriptions" ON subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all subscriptions" ON subscriptions FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_subscriptions_next ON subscriptions(next_order_date) WHERE status = 'active';
