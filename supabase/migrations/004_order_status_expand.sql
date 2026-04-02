-- 004: Expand orders.status from 3-stage to 5-stage pipeline

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','processing','packed','out_for_delivery','delivered'));
