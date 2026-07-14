-- 038_flash_sale_countdown.sql
-- Site-wide flash-sale countdown banner (admin-configured, storefront-displayed).

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS flash_sale_enabled BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS flash_sale_title TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS flash_sale_subtitle TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS flash_sale_ends_at TIMESTAMPTZ;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS flash_sale_link TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS flash_sale_bg_color TEXT;
