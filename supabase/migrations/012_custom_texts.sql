ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS custom_texts JSONB DEFAULT '{}';
