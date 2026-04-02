-- 001: Add category_id UUID FK to products; create denorm trigger

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Backfill from existing text field
UPDATE products p SET category_id = c.id
  FROM categories c WHERE p.category = c.name
  AND p.category_id IS NULL;

-- Denorm trigger: keep products.category in sync when category name changes
CREATE OR REPLACE FUNCTION sync_product_category_text()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET category = NEW.name WHERE category_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_name_change ON categories;
CREATE TRIGGER trg_category_name_change
  AFTER UPDATE OF name ON categories
  FOR EACH ROW EXECUTE FUNCTION sync_product_category_text();
