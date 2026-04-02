-- 002: Add meat commerce fields to products

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price_unit') THEN
    ALTER TABLE products ADD COLUMN price_unit TEXT DEFAULT 'per_kg' CHECK (price_unit IN ('per_kg','per_pack','per_piece','whole'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cut_type') THEN
    ALTER TABLE products ADD COLUMN cut_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='storage_type') THEN
    ALTER TABLE products ADD COLUMN storage_type TEXT DEFAULT 'fresh' CHECK (storage_type IN ('fresh','chilled','frozen'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='prep_options') THEN
    ALTER TABLE products ADD COLUMN prep_options JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_weight_kg') THEN
    ALTER TABLE products ADD COLUMN min_weight_kg NUMERIC(10,3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='related_recipe_ids') THEN
    ALTER TABLE products ADD COLUMN related_recipe_ids UUID[] DEFAULT '{}';
  END IF;
END $$;
