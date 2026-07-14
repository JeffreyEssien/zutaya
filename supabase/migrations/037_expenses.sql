-- 037_expenses.sql
-- Business expense tracking / bookkeeping → real profit (revenue − expenses).

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),   -- Naira
  incurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_incurred_on_idx ON expenses (incurred_on DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses (category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Sensitive financial data — service role only (all access via admin-gated API).
DROP POLICY IF EXISTS expenses_service_all ON expenses;
CREATE POLICY expenses_service_all ON expenses
  FOR ALL TO service_role USING (true) WITH CHECK (true);
