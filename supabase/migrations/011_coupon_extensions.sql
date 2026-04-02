-- 011: Add max_uses, expires_at, min_order_amount to coupons

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='max_uses') THEN
    ALTER TABLE coupons ADD COLUMN max_uses INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='expires_at') THEN
    ALTER TABLE coupons ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='min_order_amount') THEN
    ALTER TABLE coupons ADD COLUMN min_order_amount NUMERIC(10,2);
  END IF;
END $$;
