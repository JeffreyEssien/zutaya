-- Add about page editable fields to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_promise_text TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_quote TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_stats TEXT;
