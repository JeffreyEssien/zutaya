// ═══════════════════════════════════════════════════════════════════
// Delivery Pricing Engine — Lagos Only
// Vendor is situated in Lagos. All prices in Naira (₦).
// ═══════════════════════════════════════════════════════════════════

// ─── Lagos Zone Types ────────────────────────────────────────────

export type LagosZone = "lagos_mainland" | "lagos_island";

export interface LagosZoneInfo {
    key: LagosZone;
    label: string;
    fee: number;
    areas: string[];
}

// ─── Lagos Zones ─────────────────────────────────────────────────

// NOTE: This is a client-side FALLBACK used only when the DB fetch
// (/api/admin/delivery) fails. The DB is the source of truth and carries
// per-area doorstep_fee overrides (see migration 031_reset_delivery_locations.sql
// + areaFees in fetchDeliveryPricingFromDB). The `fee` here is a single
// zone-level default (matches each zone's base_fee); per-area fees only
// apply on the DB path.
export const LAGOS_ZONES: LagosZoneInfo[] = [
    {
        key: "lagos_mainland",
        label: "Lagos Mainland",
        fee: 5000,
        areas: [
            "Lagos Mainland", "Surulere", "Shomolu", "Ilupeju", "Anthony",
            "Kosofe", "Mushin", "Ikeja", "Apapa", "Amuwo-Odofin", "Ojo",
            "Oshodi-Isolo", "Agege", "Ajeromi-Ifelodun", "Alimosho",
            "Ifako-Ijaye", "Ikorodu", "Badagry",
        ],
    },
    {
        key: "lagos_island",
        label: "Lagos Island",
        fee: 5000,
        areas: [
            "Lagos Island", "Eti-Osa", "Lekki Phase 1", "Ibeju-Lekki", "Epe",
        ],
    },
];

// Flat map for O(1) lookups: area name (lowercase) → zone info
const _lagosAreaIndex = new Map<string, LagosZoneInfo>();
for (const zone of LAGOS_ZONES) {
    for (const area of zone.areas) {
        _lagosAreaIndex.set(area.toLowerCase(), zone);
    }
}

// ─── Lookup API ──────────────────────────────────────────────────

/**
 * Get all Lagos areas, flattened with their zone info, sorted by zone.
 */
export function getAllLagosAreas(): { area: string; zone: LagosZoneInfo }[] {
    const result: { area: string; zone: LagosZoneInfo }[] = [];
    for (const zone of LAGOS_ZONES) {
        for (const area of zone.areas) {
            result.push({ area, zone });
        }
    }
    return result;
}

/**
 * Look up the Lagos zone for a given area. Case-insensitive.
 * Returns null if the area isn't in any zone.
 */
export function lookupLagosZone(area: string): LagosZoneInfo | null {
    return _lagosAreaIndex.get(area.toLowerCase()) ?? null;
}

/**
 * Fuzzy-match a Lagos area. Returns the best match or null.
 */
export function fuzzyMatchLagosArea(input: string): { area: string; zone: LagosZoneInfo } | null {
    if (!input.trim()) return null;
    const needle = input.trim().toLowerCase();

    // 1. Exact match
    const exact = _lagosAreaIndex.get(needle);
    if (exact) {
        const matchedArea = exact.areas.find((a) => a.toLowerCase() === needle)!;
        return { area: matchedArea, zone: exact };
    }

    // 2. Starts-with match (prioritize)
    for (const zone of LAGOS_ZONES) {
        for (const area of zone.areas) {
            if (area.toLowerCase().startsWith(needle)) {
                return { area, zone };
            }
        }
    }

    // 3. Contains match
    for (const zone of LAGOS_ZONES) {
        for (const area of zone.areas) {
            if (area.toLowerCase().includes(needle)) {
                return { area, zone };
            }
        }
    }

    return null;
}

// ─── Terms & Conditions ──────────────────────────────────────────

export const LAGOS_TERMS = [
    "Delivery is typically within 1–3 working days depending on your zone.",
] as const;

// ─── DB Integration (Client-Side Fetch) ──────────────────────────

export interface DbPricingResult {
    lagosZones: LagosZoneInfo[];
    /** Map of zone name → discount percent (0–100) */
    discounts: Map<string, { percent: number; label: string | null }>;
    /** Map of area name (lowercased) → its own delivery fee, when set per-area.
     *  Lets one area in a zone charge a different fee than the zone default. */
    areaFees: Map<string, number>;
}

/**
 * Fetch delivery pricing from the API (database-backed).
 * Returns null if the fetch fails — caller should fall back to hardcoded data.
 */
export async function fetchDeliveryPricingFromDB(): Promise<DbPricingResult | null> {
    try {
        const res = await fetch("/api/admin/delivery");
        if (!res.ok) return null;
        const { zones } = await res.json();
        if (!zones || !Array.isArray(zones)) return null;

        const lagosZones: LagosZoneInfo[] = [];
        const discounts = new Map<string, { percent: number; label: string | null }>();
        const areaFees = new Map<string, number>();

        for (const z of zones) {
            if (!z.is_active) continue;
            if (z.zone_type !== "lagos") continue;

            if (z.discount_percent > 0) {
                discounts.set(z.name, { percent: z.discount_percent, label: z.discount_label });
            }

            const activeLocations = (z.locations || []).filter((l: any) => l.is_active);
            // Per-area fee override: when a location has its own doorstep_fee, that
            // area charges it instead of the zone's base fee.
            for (const l of activeLocations) {
                if (l.doorstep_fee != null && Number(l.doorstep_fee) > 0) {
                    areaFees.set(String(l.name).toLowerCase(), Number(l.doorstep_fee));
                }
            }

            const key = z.name.toLowerCase().replace(/\s+/g, "_") as LagosZone;
            lagosZones.push({
                key,
                label: z.name,
                fee: z.base_fee ?? 0,
                areas: activeLocations.map((l: any) => l.name),
            });
        }

        return { lagosZones, discounts, areaFees };
    } catch {
        return null;
    }
}

/**
 * Apply a discount to a fee.
 */
export function applyDiscount(fee: number, discountPercent: number): number {
    if (discountPercent <= 0 || discountPercent > 100) return fee;
    return Math.round(fee * (1 - discountPercent / 100));
}
