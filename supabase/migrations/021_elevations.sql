-- Mode-morphing PDP: alternate product imagery
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_cooked TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_event TEXT;

-- Meat Passport: origin/traceability
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_farm TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_breed TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_hanging_hours INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_halal_certified BOOLEAN DEFAULT TRUE;

-- Per-order passport stamp
ALTER TABLE orders ADD COLUMN IF NOT EXISTS passport_data JSONB DEFAULT '{}'::jsonb;

-- Live Kitchen: today's smoke (admin posts a hero photo + note throughout the day)
CREATE TABLE IF NOT EXISTS kitchen_smoke_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    note TEXT,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_smoke_posted ON kitchen_smoke_posts(posted_at DESC);

-- Loyalty stamps
CREATE TABLE IF NOT EXISTS loyalty_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email TEXT NOT NULL,
    category TEXT NOT NULL,
    stamps INT DEFAULT 0,
    redeemed_count INT DEFAULT 0,
    last_earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_email, category)
);
CREATE INDEX IF NOT EXISTS idx_stamps_email ON loyalty_stamps(customer_email);

-- Loyalty reward rules (admin config)
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    stamps_required INT NOT NULL DEFAULT 10,
    reward_label TEXT NOT NULL,
    discount_percent INT DEFAULT 0,
    discount_flat NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty config flags
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS loyalty_tagline TEXT DEFAULT 'Collect stamps. Earn cuts.';
