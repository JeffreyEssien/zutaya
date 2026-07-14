-- 035_stock_notifications.sql
-- Back-in-stock notifications: customers subscribe on a sold-out product/variant
-- and get emailed automatically when it is restocked.

CREATE TABLE IF NOT EXISTS stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ
);

-- One pending request per (product, variant, email) — re-subscribing is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS stock_notifications_pending_uniq
  ON stock_notifications (product_id, COALESCE(variant_name, ''), lower(email))
  WHERE notified_at IS NULL;

-- Fast lookup of who to notify when a product is restocked.
CREATE INDEX IF NOT EXISTS stock_notifications_pending_idx
  ON stock_notifications (product_id)
  WHERE notified_at IS NULL;

ALTER TABLE stock_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone (anon storefront) may subscribe.
DROP POLICY IF EXISTS stock_notifications_insert ON stock_notifications;
CREATE POLICY stock_notifications_insert ON stock_notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only the service role reads/updates the queue (server-side notify job).
DROP POLICY IF EXISTS stock_notifications_service_all ON stock_notifications;
CREATE POLICY stock_notifications_service_all ON stock_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
