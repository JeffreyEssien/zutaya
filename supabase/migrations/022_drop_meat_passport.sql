-- Remove Meat Passport (origin) fields — no longer used in UI
ALTER TABLE products DROP COLUMN IF EXISTS origin_farm;
ALTER TABLE products DROP COLUMN IF EXISTS origin_breed;
ALTER TABLE products DROP COLUMN IF EXISTS origin_hanging_hours;
ALTER TABLE products DROP COLUMN IF EXISTS origin_halal_certified;
ALTER TABLE orders DROP COLUMN IF EXISTS passport_data;
