-- 039_drop_bumpa_integration.sql
-- Removes the abandoned Bumpa order-pull integration (was migration 034).
-- Bumpa confirmed (2026-07-14) their API is not available for custom third-party
-- integrations, so the feature can never work. Drops are IF EXISTS so this is a
-- no-op on environments where 034 was never applied.

DROP TABLE IF EXISTS bumpa_orders;
DROP TABLE IF EXISTS bumpa_product_map;
ALTER TABLE orders DROP COLUMN IF EXISTS bumpa_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS source;
