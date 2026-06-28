-- ════════════════════════════════════════════════════════════════════
--  Migration 028 — Zútaya Packages (curated meat boxes)
--
--  Replaces the old build-your-own "bundle_rules" discount engine with
--  fixed, curated packages: a flat price + a list of product-linked
--  content lines. Buying a package adds its content lines to the order so
--  stock auto-deducts via create_order_atomic (each line carries
--  product_id + variant_name/inventory_item_id), while the order is
--  charged the package's flat price.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Packages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zutaya_packages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT,
    tagline     TEXT,                       -- short marketing line e.g. "Family favourite"
    price       NUMERIC(12,2) NOT NULL,     -- flat price, Naira
    image_url   TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zutaya_packages_active ON zutaya_packages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_zutaya_packages_sort ON zutaya_packages(sort_order);

-- ── 2. Package content lines ───────────────────────────────────────
--  Each line maps to a real product (+ optional variant / inventory item)
--  so stock deduction works. `label` is a display override, e.g.
--  "1kg goatmeat" or "1 pack of shaki".
CREATE TABLE IF NOT EXISTS zutaya_package_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id        UUID NOT NULL REFERENCES zutaya_packages(id) ON DELETE CASCADE,
    product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name      TEXT,                  -- snapshot of product name at link time (fallback)
    variant_name      TEXT,                  -- null = deduct from main inventory item
    inventory_item_id UUID,                  -- required when variant_name is null (for stock deduction)
    quantity          INT NOT NULL DEFAULT 1,
    label             TEXT,                  -- display override, e.g. "1kg goatmeat"
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zutaya_package_items_package ON zutaya_package_items(package_id);

-- ── 3. updated_at trigger (touch_updated_at exists from earlier migrations) ──
DROP TRIGGER IF EXISTS trg_zutaya_packages_updated_at ON zutaya_packages;
CREATE TRIGGER trg_zutaya_packages_updated_at BEFORE UPDATE ON zutaya_packages
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 4. RLS ─────────────────────────────────────────────────────────
ALTER TABLE zutaya_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE zutaya_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active packages" ON zutaya_packages;
CREATE POLICY "Public read active packages" ON zutaya_packages FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Service role all packages" ON zutaya_packages;
CREATE POLICY "Service role all packages" ON zutaya_packages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read package items" ON zutaya_package_items;
CREATE POLICY "Public read package items" ON zutaya_package_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role all package items" ON zutaya_package_items;
CREATE POLICY "Service role all package items" ON zutaya_package_items FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Retire the old build-your-own bundle engine ─────────────────
DROP TABLE IF EXISTS bundle_rules CASCADE;
