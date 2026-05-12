-- Batch 1: Services foundation (Processing, Kitchen, Events)

-- Settings additions
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS delivery_cutoff_hour INT DEFAULT 12;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS delivery_cutoff_label TEXT DEFAULT 'Orders placed after 12:00 PM ship the next day';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS kitchen_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS kitchen_hero_image TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS kitchen_tagline TEXT DEFAULT 'Fired up daily. Delivered hot.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS kitchen_lead_minutes INT DEFAULT 90;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS events_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS events_tagline TEXT DEFAULT 'From slaughter to plate, on-site.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS butcher_profiles JSONB DEFAULT '[]'::jsonb;

-- Marinades / cure presets (admin-managed)
CREATE TABLE IF NOT EXISTS marinades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    extra_fee NUMERIC(10,2) DEFAULT 0,
    cure_hours INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing options (mince, cube, butterfly, debone, vacuum-seal etc.)
CREATE TABLE IF NOT EXISTS processing_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    extra_fee NUMERIC(10,2) DEFAULT 0,
    extends_shelf_life BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kitchen (grill house) menu items
CREATE TABLE IF NOT EXISTS kitchen_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    category TEXT,
    available_from TIME,
    available_to TIME,
    daily_capacity INT DEFAULT 0,
    lead_minutes INT DEFAULT 90,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kitchen daily counters (resets per day)
CREATE TABLE IF NOT EXISTS kitchen_daily_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES kitchen_menu_items(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    count INT DEFAULT 0,
    UNIQUE(menu_item_id, date)
);

-- Event occasions (wedding, owambe, corporate, birthday, etc.)
CREATE TABLE IF NOT EXISTS event_occasions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    typical_headcount_min INT,
    typical_headcount_max INT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event animals (whole goat, ram, cow, etc. with yield math)
CREATE TABLE IF NOT EXISTS event_animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    base_price NUMERIC(10,2) NOT NULL,
    feeds_adults INT NOT NULL DEFAULT 1,
    typical_weight_kg NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event service tiers (slaughter only / + cuts / + grilling / full chef)
CREATE TABLE IF NOT EXISTS event_service_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_modifier NUMERIC(10,2) DEFAULT 0,
    price_per_head NUMERIC(10,2) DEFAULT 0,
    includes TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service bookings (outdoor butchery / events)
CREATE TABLE IF NOT EXISTS service_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    occasion_id UUID REFERENCES event_occasions(id) ON DELETE SET NULL,
    occasion_label TEXT,
    headcount INT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    location_notes TEXT,
    animal_selections JSONB DEFAULT '[]'::jsonb,
    service_tier_id UUID REFERENCES event_service_tiers(id) ON DELETE SET NULL,
    service_tier_label TEXT,
    add_ons JSONB DEFAULT '[]'::jsonb,
    estimated_total NUMERIC(10,2),
    quoted_total NUMERIC(10,2),
    deposit_amount NUMERIC(10,2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'inquiry',
    admin_notes TEXT,
    customer_notes TEXT,
    leftover_kg NUMERIC(10,2),
    converted_to_order_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON service_bookings(status);
CREATE INDEX IF NOT EXISTS idx_service_bookings_event_date ON service_bookings(event_date);

-- Post-event followups (for upsell loop)
CREATE TABLE IF NOT EXISTS post_event_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES service_bookings(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    conversion_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order extension: completion mode (cook-myself / kitchen / event)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completion_mode TEXT DEFAULT 'cook_myself';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchen_ready_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_booking_id UUID REFERENCES service_bookings(id) ON DELETE SET NULL;

-- CartItem-level processing data lives in cart_items? No — orders.items JSONB already holds it.
-- Add per-item processing metadata via order_items_meta if needed later.
