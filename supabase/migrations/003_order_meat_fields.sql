-- 003: Add meat commerce fields to orders

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='packaging_fee') THEN
    ALTER TABLE orders ADD COLUMN packaging_fee NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='prep_fee') THEN
    ALTER TABLE orders ADD COLUMN prep_fee NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='prep_instructions') THEN
    ALTER TABLE orders ADD COLUMN prep_instructions TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='requested_delivery_date') THEN
    ALTER TABLE orders ADD COLUMN requested_delivery_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='requested_delivery_slot') THEN
    ALTER TABLE orders ADD COLUMN requested_delivery_slot TEXT CHECK (requested_delivery_slot IS NULL OR requested_delivery_slot IN ('morning','afternoon','evening'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_fee') THEN
    ALTER TABLE orders ADD COLUMN delivery_fee NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='subscription_id') THEN
    ALTER TABLE orders ADD COLUMN subscription_id UUID;
  END IF;
END $$;
