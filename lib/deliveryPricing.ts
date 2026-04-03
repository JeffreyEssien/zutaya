// ═══════════════════════════════════════════════════════════════════
// Delivery Pricing Engine — Lagos Only
// Vendor is situated in Lagos. All prices in Naira (₦).
// ═══════════════════════════════════════════════════════════════════

// ─── Lagos Zone Types ────────────────────────────────────────────

export type LagosZone =
    | "island_core"
    | "island_extension"
    | "mainland_core"
    | "mainland_extension";

export interface LagosZoneInfo {
    key: LagosZone;
    label: string;
    fee: number;
    areas: string[];
}

// ─── Lagos Zones ─────────────────────────────────────────────────

export const LAGOS_ZONES: LagosZoneInfo[] = [
    {
        key: "island_core",
        label: "Island Core",
        fee: 3500,
        areas: [
            "Ikate", "Lekki Phase 1", "Chevron", "Osapa London", "Ikoyi",
            "Victoria Island (VI)", "Oniru", "Banana Island", "Salem",
            "Jakande", "Agungi", "Ajah", "Ikota",
        ],
    },
    {
        key: "island_extension",
        label: "Island Extension",
        fee: 5000,
        areas: [
            "Sangotedo", "Awoyaya", "Marina", "CMS", "Apapa", "Ijora",
            "Mile 2", "Festac", "Satellite Town", "Trade Fair",
            "LASU (Ojo)", "Iyana Iba",
        ],
    },
    {
        key: "mainland_core",
        label: "Mainland Core",
        fee: 5000,
        areas: [
            "Surulere", "Ojuelegba", "Mushin", "Isolo", "Oshodi",
            "Anthony", "Maryland", "Palmgrove", "Shomolu", "Bariga",
            "Gbagada", "Oworoshoki", "Yaba", "Ebute Metta", "Oyingbo",
            "Fadeyi", "Jibowu", "Ikeja", "Ogba", "Ojota", "Ketu",
            "Ogudu", "Magodo", "Iju Ishaga", "LUTH (Idi-Araba)",
        ],
    },
    {
        key: "mainland_extension",
        label: "Mainland Extension",
        fee: 6000,
        areas: [
            "Ikorodu", "Ikotun", "Egbeda", "Ipaja", "Iyana Ipaja",
            "Ayobo", "Command", "Abule Egba", "Agege", "Dopemu", "Fagba",
            "Isheri Olowora", "Akute", "Berger", "Lambe Alagbado",
            "Ishashi", "Igando", "Ejigbo", "Ago Palace",
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

        for (const z of zones) {
            if (!z.is_active) continue;
            if (z.zone_type !== "lagos") continue;

            if (z.discount_percent > 0) {
                discounts.set(z.name, { percent: z.discount_percent, label: z.discount_label });
            }

            const key = z.name.toLowerCase().replace(/\s+/g, "_") as LagosZone;
            lagosZones.push({
                key,
                label: z.name,
                fee: z.base_fee ?? 0,
                areas: (z.locations || [])
                    .filter((l: any) => l.is_active)
                    .map((l: any) => l.name),
            });
        }

        return { lagosZones, discounts };
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
