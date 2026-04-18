-- 018: Media gallery table + hero display config

CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  public_id TEXT,
  type TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video')),
  name TEXT NOT NULL,
  folder TEXT DEFAULT 'zutaya',
  width INT,
  height INT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);

-- Hero display config stored as JSONB in site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_display_config JSONB DEFAULT '{"mode":"single","mediaIds":[],"slideshowInterval":5}';
