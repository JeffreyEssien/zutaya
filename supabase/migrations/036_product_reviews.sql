-- 036_product_reviews.sql
-- Customer product reviews & star ratings, with admin moderation.

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  email TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS product_reviews_product_status_idx
  ON product_reviews (product_id, status);

CREATE INDEX IF NOT EXISTS product_reviews_status_idx
  ON product_reviews (status, created_at DESC);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Public may read only approved reviews.
DROP POLICY IF EXISTS product_reviews_select_approved ON product_reviews;
CREATE POLICY product_reviews_select_approved ON product_reviews
  FOR SELECT TO anon, authenticated USING (status = 'approved');

-- All writes (submit via API, moderation) go through the service role.
DROP POLICY IF EXISTS product_reviews_service_all ON product_reviews;
CREATE POLICY product_reviews_service_all ON product_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
