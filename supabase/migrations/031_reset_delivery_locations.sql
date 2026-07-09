-- ═══════════════════════════════════════════════════════════════════
-- 031 — Reset Lagos delivery zones + locations
-- Clears ALL existing delivery zones/locations and reseeds two zones
-- (Lagos Mainland, Lagos Island) with per-area doorstep fees.
-- Per-area fee lives in delivery_locations.doorstep_fee and overrides
-- the zone base_fee (see lib/deliveryPricing.ts areaFees).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Wipe existing routes. locations cascade on zone delete, but clear both
-- explicitly so interstate/legacy rows go too.
DELETE FROM delivery_locations;
DELETE FROM delivery_zones;

-- ── Zones ────────────────────────────────────────────────────────
-- base_fee is only a fallback for locations without their own fee;
-- every location below sets an explicit doorstep_fee.
INSERT INTO delivery_zones (name, zone_type, base_fee, is_active, sort_order)
VALUES
    ('Lagos Mainland', 'lagos', 5000, true, 1),
    ('Lagos Island',   'lagos', 5000, true, 2);

-- ── Locations ────────────────────────────────────────────────────
INSERT INTO delivery_locations (zone_id, name, doorstep_fee, is_active)
SELECT z.id, v.name, v.fee, true
FROM (VALUES
    -- Lagos Mainland
    ('Lagos Mainland', 'Lagos Mainland',    3000),
    ('Lagos Mainland', 'Surulere',          3000),
    ('Lagos Mainland', 'Shomolu',           3000),
    ('Lagos Mainland', 'Ilupeju',           3000),
    ('Lagos Mainland', 'Anthony',           3000),
    ('Lagos Mainland', 'Kosofe',            4000),
    ('Lagos Mainland', 'Mushin',            4000),
    ('Lagos Mainland', 'Ikeja',             5000),
    ('Lagos Mainland', 'Apapa',             5000),
    ('Lagos Mainland', 'Amuwo-Odofin',      5000),
    ('Lagos Mainland', 'Ojo',               5000),
    ('Lagos Mainland', 'Oshodi-Isolo',      5000),
    ('Lagos Mainland', 'Agege',             6000),
    ('Lagos Mainland', 'Ajeromi-Ifelodun',  6000),
    ('Lagos Mainland', 'Alimosho',          6000),
    ('Lagos Mainland', 'Ifako-Ijaye',       6000),
    ('Lagos Mainland', 'Ikorodu',           7000),
    ('Lagos Mainland', 'Badagry',           8000),
    -- Lagos Island
    ('Lagos Island',   'Lagos Island',      4000),
    ('Lagos Island',   'Eti-Osa',           5000),
    ('Lagos Island',   'Lekki Phase 1',     5000),
    ('Lagos Island',   'Ibeju-Lekki',       7000),
    ('Lagos Island',   'Epe',               8000)
) AS v(zone_name, name, fee)
JOIN delivery_zones z ON z.name = v.zone_name;

COMMIT;
