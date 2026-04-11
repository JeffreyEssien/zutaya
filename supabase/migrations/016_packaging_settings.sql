-- Add packaging configuration to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS packaging_fee NUMERIC(10,2) DEFAULT 500;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS packaging_label TEXT DEFAULT 'Premium Packaging';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS packaging_description TEXT DEFAULT 'Insulated gift-ready packaging with ice packs for extended freshness';
