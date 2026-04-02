-- 005: Add meat fields to inventory_items, change stock to NUMERIC

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='stock_unit') THEN
    ALTER TABLE inventory_items ADD COLUMN stock_unit TEXT DEFAULT 'units';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='batch_number') THEN
    ALTER TABLE inventory_items ADD COLUMN batch_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='expiry_date') THEN
    ALTER TABLE inventory_items ADD COLUMN expiry_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='storage_type') THEN
    ALTER TABLE inventory_items ADD COLUMN storage_type TEXT CHECK (storage_type IS NULL OR storage_type IN ('fresh','chilled','frozen'));
  END IF;

  -- Change stock from INT to NUMERIC(10,3)
  ALTER TABLE inventory_items ALTER COLUMN stock TYPE NUMERIC(10,3) USING stock::NUMERIC(10,3);
END $$;
