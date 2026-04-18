-- Add featured_slides JSONB column to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS featured_slides JSONB DEFAULT '[]'::jsonb;
