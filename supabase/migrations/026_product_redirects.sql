-- 026: Product URL redirects.
-- When a product is deleted, its URL would otherwise 404 and lose any SEO
-- equity (backlinks, indexed ranking). We record a 301/308 redirect target
-- (its category listing, falling back to /shop) so that value is preserved.

CREATE TABLE IF NOT EXISTS product_redirects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  old_slug TEXT NOT NULL UNIQUE,
  target_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_redirects_slug ON product_redirects(old_slug);
