// ═══════════════════════════════════════════════════════════════════
// Delivery Pricing Engine — IB Ultimate Logistics
// Vendor is situated in Lagos. All prices in Naira (₦).
// ═══════════════════════════════════════════════════════════════════

export type DeliveryType = "hub_pickup" | "doorstep";

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

// ─── Interstate Types ────────────────────────────────────────────

export interface InterstateCity {
    name: string;
    hubPickup: number;
    doorstep: number;
}

export interface InterstateState {
    state: string;
    cities: InterstateCity[];
    /** Delivery time estimate for hub pickup */
    hubEstimate: string;
    /** Delivery time estimate for doorstep */
    doorstepEstimate: string;
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

// ─── Interstate Data (by Nigerian State) ─────────────────────────

export const INTERSTATE_DATA: InterstateState[] = [
    // ── West ──
    {
        state: "Ekiti",
        hubEstimate: "1–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Ado-Ekiti", hubPickup: 4000, doorstep: 6500 },
            { name: "Oye-Ekiti", hubPickup: 4000, doorstep: 6500 },
            { name: "Ikere-Ekiti", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    {
        state: "Osun",
        hubEstimate: "1–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Ede", hubPickup: 4000, doorstep: 6500 },
            { name: "Ilesha", hubPickup: 3500, doorstep: 6500 },
            { name: "Ile-Ife", hubPickup: 4000, doorstep: 6500 },
            { name: "Osogbo", hubPickup: 3500, doorstep: 6500 },
            { name: "Iree", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    {
        state: "Oyo",
        hubEstimate: "1–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Ibadan", hubPickup: 3500, doorstep: 6000 },
            { name: "Ogbomosho", hubPickup: 4000, doorstep: 6500 },
            { name: "Oyo Town", hubPickup: 4000, doorstep: 6500 },
            { name: "Saki", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    {
        state: "Kwara",
        hubEstimate: "1–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Ilorin", hubPickup: 3500, doorstep: 6500 },
            { name: "Offa", hubPickup: 3500, doorstep: 6500 },
        ],
    },
    {
        state: "Ogun",
        hubEstimate: "1–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Abeokuta", hubPickup: 3500, doorstep: 6500 },
            { name: "Ijebu", hubPickup: 3500, doorstep: 6500 },
            { name: "Sagamu", hubPickup: 3500, doorstep: 6000 },
            { name: "Ilaro", hubPickup: 3500, doorstep: 6500 },
            { name: "Ago-Iwoye", hubPickup: 3500, doorstep: 6000 },
            { name: "Mowe", hubPickup: 3000, doorstep: 6000 },
            { name: "Sapaade", hubPickup: 3500, doorstep: 6000 },
        ],
    },
    {
        state: "Ondo",
        hubEstimate: "1–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Akure", hubPickup: 3500, doorstep: 6500 },
            { name: "Owo", hubPickup: 4000, doorstep: 6500 },
            { name: "Ondo", hubPickup: 4000, doorstep: 6500 },
            { name: "Ore", hubPickup: 3500, doorstep: 6000 },
            { name: "Akungba", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    // ── South ──
    {
        state: "Edo",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Benin City", hubPickup: 4000, doorstep: 7000 },
            { name: "Okada", hubPickup: 6000, doorstep: 8000 },
            { name: "Ekpoma", hubPickup: 4000, doorstep: 8000 },
            { name: "Auchi", hubPickup: 5000, doorstep: 8000 },
            { name: "Uromi", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Delta",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Warri", hubPickup: 4000, doorstep: 7000 },
            { name: "Asaba", hubPickup: 4000, doorstep: 7000 },
            { name: "Sapele", hubPickup: 4000, doorstep: 7000 },
            { name: "Abraka", hubPickup: 4000, doorstep: 7000 },
            { name: "Oghara", hubPickup: 4000, doorstep: 8000 },
            { name: "Ozoro", hubPickup: 5000, doorstep: 7000 },
            { name: "Kwale", hubPickup: 5000, doorstep: 8000 },
            { name: "Agbor", hubPickup: 4000, doorstep: 8000 },
            { name: "Oleh", hubPickup: 6000, doorstep: 9000 },
        ],
    },
    {
        state: "Bayelsa",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Yenagoa", hubPickup: 4500, doorstep: 8000 },
        ],
    },
    {
        state: "Rivers",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Port Harcourt", hubPickup: 4000, doorstep: 8000 },
        ],
    },
    {
        state: "Akwa Ibom",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Uyo", hubPickup: 5000, doorstep: 9000 },
            { name: "Ikot Ekpene", hubPickup: 8000, doorstep: 9000 },
            { name: "Eket", hubPickup: 8000, doorstep: 9000 },
        ],
    },
    {
        state: "Cross River",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Calabar", hubPickup: 6000, doorstep: 9000 },
            { name: "Ogoja", hubPickup: 7000, doorstep: 9000 },
            { name: "Obudu", hubPickup: 7000, doorstep: 9000 },
            { name: "Ikom", hubPickup: 9000, doorstep: 10000 },
        ],
    },
    // ── East ──
    {
        state: "Anambra",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Onitsha", hubPickup: 4000, doorstep: 8000 },
            { name: "Awka", hubPickup: 4000, doorstep: 8000 },
            { name: "Nnewi", hubPickup: 5000, doorstep: 8000 },
            { name: "Oko", hubPickup: 5000, doorstep: 8000 },
            { name: "Ekwulobia", hubPickup: 5000, doorstep: 8000 },
            { name: "Ihiala", hubPickup: 5000, doorstep: 8000 },
            { name: "Uli", hubPickup: 5000, doorstep: 8000 },
            { name: "Okija", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Enugu",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Enugu", hubPickup: 4000, doorstep: 8000 },
            { name: "Nsukka", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Ebonyi",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Abakaliki", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Imo",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Owerri", hubPickup: 4000, doorstep: 8000 },
            { name: "Okigwe", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Abia",
        hubEstimate: "2–3 days after pick up",
        doorstepEstimate: "3–5 working days",
        cities: [
            { name: "Aba", hubPickup: 4000, doorstep: 8000 },
            { name: "Umuahia", hubPickup: 5000, doorstep: 8000 },
            { name: "Uturu", hubPickup: 6000, doorstep: 8000 },
        ],
    },
];

// Index: state name (lowercase) → InterstateState
const _interstateIndex = new Map<string, InterstateState>();
for (const entry of INTERSTATE_DATA) {
    _interstateIndex.set(entry.state.toLowerCase(), entry);
}

// ─── All Nigerian States (36 + FCT) ─────────────────────────────

export const NIGERIAN_STATES = [
    "Lagos",
    // ── South-West ──
    "Ogun", "Oyo", "Osun", "Ondo", "Ekiti", "Kwara",
    // ── South-South ──
    "Edo", "Delta", "Bayelsa", "Rivers", "Akwa Ibom", "Cross River",
    // ── South-East ──
    "Anambra", "Enugu", "Ebonyi", "Imo", "Abia",
    // ── North-Central ──
    "FCT (Abuja)", "Benue", "Kogi", "Nassarawa", "Niger", "Plateau",
    // ── North-West ──
    "Kaduna", "Kano", "Katsina", "Kebbi", "Jigawa", "Sokoto", "Zamfara",
    // ── North-East ──
    "Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe",
] as const;

export type NigerianState = typeof NIGERIAN_STATES[number];

// States we have pricing data for
const COVERED_INTERSTATE_STATES = new Set(INTERSTATE_DATA.map((d) => d.state));

// ─── Lookup API ──────────────────────────────────────────────────

/**
 * Determine if the given state is Lagos.
 */
export function isLagos(state: string): boolean {
    return state.toLowerCase() === "lagos";
}

/**
 * Check whether we have interstate pricing for a given state.
 */
export function hasInterstatePricing(state: string): boolean {
    return _interstateIndex.has(state.toLowerCase());
}

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
 * Uses normalized substring matching so user input like "lekki" matches "Lekki Phase 1",
 * and "vi" or "victoria" matches "Victoria Island (VI)".
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

/**
 * Get interstate data for a state.
 */
export function getInterstateState(state: string): InterstateState | null {
    return _interstateIndex.get(state.toLowerCase()) ?? null;
}

/**
 * Get the delivery fee for an interstate city.
 */
export function getInterstateFee(
    state: string,
    cityName: string,
    type: DeliveryType
): number | null {
    const data = getInterstateState(state);
    if (!data) return null;
    const city = data.cities.find(
        (c) => c.name.toLowerCase() === cityName.toLowerCase()
    );
    if (!city) return null;
    return type === "hub_pickup" ? city.hubPickup : city.doorstep;
}

// ─── Terms & Conditions ──────────────────────────────────────────

export const INTERSTATE_TERMS = [
    "Pricing applies to items weighing between 0–2 kg.",
    "Each additional kilogram attracts a ₦1,000 surcharge.",
    "Pick-up fee from the vendor is not included in the delivery price.",
    "An additional fee of ₦500 may apply for remote area deliveries.",
    "Hub pickup takes 1–3 days after the item is picked up.",
    "Doorstep delivery takes 3–5 working days.",
] as const;

export const LAGOS_TERMS = [
    "Delivery is typically within 1–3 working days depending on your zone.",
] as const;

/** Extra weight surcharge: ₦1,000 per additional kg above 2 kg */
export const EXTRA_WEIGHT_PER_KG = 1000;
/** Base weight allowance in kg */
export const BASE_WEIGHT_KG = 2;
/** Possible remote area surcharge */
export const REMOTE_AREA_SURCHARGE = 500;

// ─── DB Integration (Client-Side Fetch) ──────────────────────────

export interface DbPricingResult {
    lagosZones: LagosZoneInfo[];
    interstateStates: InterstateState[];
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
        const interstateStates: InterstateState[] = [];
        const discounts = new Map<string, { percent: number; label: string | null }>();

        for (const z of zones) {
            if (!z.is_active) continue;

            // Track discounts
            if (z.discount_percent > 0) {
                discounts.set(z.name, { percent: z.discount_percent, label: z.discount_label });
            }

            if (z.zone_type === "lagos") {
                const key = z.name.toLowerCase().replace(/\s+/g, "_") as LagosZone;
                lagosZones.push({
                    key,
                    label: z.name,
                    fee: z.base_fee ?? 0,
                    areas: (z.locations || [])
                        .filter((l: any) => l.is_active)
                        .map((l: any) => l.name),
                });
            } else {
                interstateStates.push({
                    state: z.name,
                    hubEstimate: z.hub_estimate || "1–3 days",
                    doorstepEstimate: z.doorstep_estimate || "3–5 working days",
                    cities: (z.locations || [])
                        .filter((l: any) => l.is_active)
                        .map((l: any) => ({
                            name: l.name,
                            hubPickup: l.hub_pickup_fee ?? 0,
                            doorstep: l.doorstep_fee ?? 0,
                        })),
                });
            }
        }

        return { lagosZones, interstateStates, discounts };
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
