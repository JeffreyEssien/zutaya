/**
 * Seed script: Populates delivery_zones and delivery_locations from hardcoded data.
 *
 * Usage: npx tsx scripts/seed-delivery.ts
 *
 * Environment: Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *              (loaded automatically from .env.local)
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local (tsx doesn't auto-load Next.js env files)
try {
    const envPath = resolve(__dirname, "../.env.local");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
    }
} catch { /* .env.local not found, rely on existing env */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(url, key);

// ── Lagos Zones (flat fee, no per-location pricing) ──
const LAGOS_ZONES = [
    {
        name: "Island Core",
        base_fee: 3500,
        sort_order: 1,
        areas: [
            "Ikate", "Lekki Phase 1", "Chevron", "Osapa London", "Ikoyi",
            "Victoria Island (VI)", "Oniru", "Banana Island", "Salem",
            "Jakande", "Agungi", "Ajah", "Ikota",
        ],
    },
    {
        name: "Island Extension",
        base_fee: 5000,
        sort_order: 2,
        areas: [
            "Sangotedo", "Awoyaya", "Marina", "CMS", "Apapa", "Ijora",
            "Mile 2", "Festac", "Satellite Town", "Trade Fair",
            "LASU (Ojo)", "Iyana Iba",
        ],
    },
    {
        name: "Mainland Core",
        base_fee: 5000,
        sort_order: 3,
        areas: [
            "Surulere", "Ojuelegba", "Mushin", "Isolo", "Oshodi",
            "Anthony", "Maryland", "Palmgrove", "Shomolu", "Bariga",
            "Gbagada", "Oworoshoki", "Yaba", "Ebute Metta", "Oyingbo",
            "Fadeyi", "Jibowu", "Ikeja", "Ogba", "Ojota", "Ketu",
            "Ogudu", "Magodo", "Iju Ishaga", "LUTH (Idi-Araba)",
        ],
    },
    {
        name: "Mainland Extension",
        base_fee: 6000,
        sort_order: 4,
        areas: [
            "Ikorodu", "Ikotun", "Egbeda", "Ipaja", "Iyana Ipaja",
            "Ayobo", "Command", "Abule Egba", "Agege", "Dopemu", "Fagba",
            "Isheri Olowora", "Akute", "Berger", "Lambe Alagbado",
            "Ishashi", "Igando", "Ejigbo", "Ago Palace",
        ],
    },
];

// ── Interstate data ──
const INTERSTATE = [
    {
        state: "Ekiti", hub: "1–3 days after pick up", door: "3–5 working days", sort: 10,
        cities: [
            { name: "Ado-Ekiti", hubPickup: 4000, doorstep: 6500 },
            { name: "Oye-Ekiti", hubPickup: 4000, doorstep: 6500 },
            { name: "Ikere-Ekiti", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    {
        state: "Osun", hub: "1–3 days after pick up", door: "3–5 working days", sort: 11,
        cities: [
            { name: "Ede", hubPickup: 4000, doorstep: 6500 },
            { name: "Ilesha", hubPickup: 3500, doorstep: 6500 },
            { name: "Ile-Ife", hubPickup: 4000, doorstep: 6500 },
            { name: "Osogbo", hubPickup: 3500, doorstep: 6500 },
            { name: "Iree", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    {
        state: "Oyo", hub: "1–3 days after pick up", door: "3–5 working days", sort: 12,
        cities: [
            { name: "Ibadan", hubPickup: 3500, doorstep: 6000 },
            { name: "Ogbomosho", hubPickup: 4000, doorstep: 6500 },
            { name: "Oyo Town", hubPickup: 4000, doorstep: 6500 },
            { name: "Saki", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    {
        state: "Kwara", hub: "1–3 days after pick up", door: "3–5 working days", sort: 13,
        cities: [
            { name: "Ilorin", hubPickup: 3500, doorstep: 6500 },
            { name: "Offa", hubPickup: 3500, doorstep: 6500 },
        ],
    },
    {
        state: "Ogun", hub: "1–3 days after pick up", door: "3–5 working days", sort: 14,
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
        state: "Ondo", hub: "1–3 days after pick up", door: "3–5 working days", sort: 15,
        cities: [
            { name: "Akure", hubPickup: 3500, doorstep: 6500 },
            { name: "Owo", hubPickup: 4000, doorstep: 6500 },
            { name: "Ondo", hubPickup: 4000, doorstep: 6500 },
            { name: "Ore", hubPickup: 3500, doorstep: 6000 },
            { name: "Akungba", hubPickup: 4000, doorstep: 6500 },
        ],
    },
    {
        state: "Edo", hub: "2–3 days after pick up", door: "3–5 working days", sort: 20,
        cities: [
            { name: "Benin City", hubPickup: 4000, doorstep: 7000 },
            { name: "Okada", hubPickup: 6000, doorstep: 8000 },
            { name: "Ekpoma", hubPickup: 4000, doorstep: 8000 },
            { name: "Auchi", hubPickup: 5000, doorstep: 8000 },
            { name: "Uromi", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Delta", hub: "2–3 days after pick up", door: "3–5 working days", sort: 21,
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
        state: "Bayelsa", hub: "2–3 days after pick up", door: "3–5 working days", sort: 22,
        cities: [{ name: "Yenagoa", hubPickup: 4500, doorstep: 8000 }],
    },
    {
        state: "Rivers", hub: "2–3 days after pick up", door: "3–5 working days", sort: 23,
        cities: [{ name: "Port Harcourt", hubPickup: 4000, doorstep: 8000 }],
    },
    {
        state: "Akwa Ibom", hub: "2–3 days after pick up", door: "3–5 working days", sort: 24,
        cities: [
            { name: "Uyo", hubPickup: 5000, doorstep: 9000 },
            { name: "Ikot Ekpene", hubPickup: 8000, doorstep: 9000 },
            { name: "Eket", hubPickup: 8000, doorstep: 9000 },
        ],
    },
    {
        state: "Cross River", hub: "2–3 days after pick up", door: "3–5 working days", sort: 25,
        cities: [
            { name: "Calabar", hubPickup: 6000, doorstep: 9000 },
            { name: "Ogoja", hubPickup: 7000, doorstep: 9000 },
            { name: "Obudu", hubPickup: 7000, doorstep: 9000 },
            { name: "Ikom", hubPickup: 9000, doorstep: 10000 },
        ],
    },
    {
        state: "Anambra", hub: "2–3 days after pick up", door: "3–5 working days", sort: 30,
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
        state: "Enugu", hub: "2–3 days after pick up", door: "3–5 working days", sort: 31,
        cities: [
            { name: "Enugu", hubPickup: 4000, doorstep: 8000 },
            { name: "Nsukka", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Ebonyi", hub: "2–3 days after pick up", door: "3–5 working days", sort: 32,
        cities: [{ name: "Abakaliki", hubPickup: 5000, doorstep: 8000 }],
    },
    {
        state: "Imo", hub: "2–3 days after pick up", door: "3–5 working days", sort: 33,
        cities: [
            { name: "Owerri", hubPickup: 4000, doorstep: 8000 },
            { name: "Okigwe", hubPickup: 5000, doorstep: 8000 },
        ],
    },
    {
        state: "Abia", hub: "2–3 days after pick up", door: "3–5 working days", sort: 34,
        cities: [
            { name: "Aba", hubPickup: 4000, doorstep: 8000 },
            { name: "Umuahia", hubPickup: 5000, doorstep: 8000 },
            { name: "Uturu", hubPickup: 6000, doorstep: 8000 },
        ],
    },
    // ── North ──
    {
        state: "Abuja (FCT)", hub: "3–5 days after pick up", door: "3–5 working days", sort: 40,
        cities: [{ name: "Abuja", hubPickup: 5000, doorstep: 9000 }],
    },
    {
        state: "Plateau", hub: "3–5 days after pick up", door: "3–5 working days", sort: 41,
        cities: [
            { name: "Jos", hubPickup: 7000, doorstep: 9000 },
            { name: "Plateau", hubPickup: 7000, doorstep: 9000 },
        ],
    },
    {
        state: "Kaduna", hub: "3–5 days after pick up", door: "3–5 working days", sort: 42,
        cities: [
            { name: "Kaduna", hubPickup: 7000, doorstep: 9000 },
            { name: "Zaria", hubPickup: 7000, doorstep: 9000 },
        ],
    },
    {
        state: "Kano", hub: "3–5 days after pick up", door: "3–5 working days", sort: 43,
        cities: [{ name: "Kano", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Katsina", hub: "3–5 days after pick up", door: "3–5 working days", sort: 44,
        cities: [{ name: "Katsina", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Kogi", hub: "3–5 days after pick up", door: "3–5 working days", sort: 45,
        cities: [
            { name: "Lokoja", hubPickup: 5000, doorstep: 9000 },
            { name: "Kabba", hubPickup: 7000, doorstep: 9000 },
            { name: "Ayingba", hubPickup: 7000, doorstep: 9000 },
            { name: "Otukpo", hubPickup: 7000, doorstep: 9000 },
        ],
    },
    {
        state: "Borno", hub: "3–5 days after pick up", door: "3–5 working days", sort: 46,
        cities: [{ name: "Maiduguri", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Bauchi", hub: "3–5 days after pick up", door: "3–5 working days", sort: 47,
        cities: [{ name: "Bauchi", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Niger", hub: "3–5 days after pick up", door: "3–5 working days", sort: 48,
        cities: [{ name: "Minna", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Zamfara", hub: "3–5 days after pick up", door: "3–5 working days", sort: 49,
        cities: [{ name: "Zamfara", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Sokoto", hub: "3–5 days after pick up", door: "3–5 working days", sort: 50,
        cities: [{ name: "Sokoto", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Kebbi", hub: "3–5 days after pick up", door: "3–5 working days", sort: 51,
        cities: [{ name: "Kebbi", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Jigawa", hub: "3–5 days after pick up", door: "3–5 working days", sort: 52,
        cities: [
            { name: "Jigawa", hubPickup: 7000, doorstep: 9000 },
            { name: "Dutse", hubPickup: 7000, doorstep: 9000 },
        ],
    },
    {
        state: "Taraba", hub: "3–5 days after pick up", door: "3–5 working days", sort: 53,
        cities: [{ name: "Taraba", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Gombe", hub: "3–5 days after pick up", door: "3–5 working days", sort: 54,
        cities: [{ name: "Gombe", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Yobe", hub: "3–5 days after pick up", door: "3–5 working days", sort: 55,
        cities: [{ name: "Yobe", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Nasarawa", hub: "3–5 days after pick up", door: "3–5 working days", sort: 56,
        cities: [{ name: "Nasarawa", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Benue", hub: "3–5 days after pick up", door: "3–5 working days", sort: 57,
        cities: [{ name: "Benue", hubPickup: 7000, doorstep: 9000 }],
    },
    {
        state: "Adamawa", hub: "3–5 days after pick up", door: "3–5 working days", sort: 58,
        cities: [{ name: "Adamawa", hubPickup: 7000, doorstep: 9000 }],
    },
];

async function seed() {
    console.log("🚚 Seeding delivery data...\n");

    // ── Lagos Zones ──
    for (const zone of LAGOS_ZONES) {
        console.log(`  Creating Lagos zone: ${zone.name}`);
        const { data: zoneData, error: zError } = await supabase
            .from("delivery_zones")
            .insert({
                name: zone.name,
                zone_type: "lagos",
                base_fee: zone.base_fee,
                allows_hub_pickup: false,
                sort_order: zone.sort_order,
            })
            .select("id")
            .single();

        if (zError) {
            console.error(`    ❌ Failed: ${zError.message}`);
            continue;
        }

        // Insert locations
        const locations = zone.areas.map((area) => ({
            zone_id: zoneData.id,
            name: area,
            hub_pickup_fee: null,
            doorstep_fee: null, // Uses zone base_fee for Lagos
        }));

        const { error: lError } = await supabase.from("delivery_locations").insert(locations);
        if (lError) {
            console.error(`    ❌ Locations failed: ${lError.message}`);
        } else {
            console.log(`    ✅ ${zone.areas.length} locations added`);
        }
    }

    // ── Interstate Zones ──
    for (const state of INTERSTATE) {
        console.log(`  Creating interstate zone: ${state.state}`);
        const { data: zoneData, error: zError } = await supabase
            .from("delivery_zones")
            .insert({
                name: state.state,
                zone_type: "interstate",
                base_fee: null,
                allows_hub_pickup: true,
                hub_estimate: state.hub,
                doorstep_estimate: state.door,
                sort_order: state.sort,
            })
            .select("id")
            .single();

        if (zError) {
            console.error(`    ❌ Failed: ${zError.message}`);
            continue;
        }

        const locations = state.cities.map((city) => ({
            zone_id: zoneData.id,
            name: city.name,
            hub_pickup_fee: city.hubPickup,
            doorstep_fee: city.doorstep,
        }));

        const { error: lError } = await supabase.from("delivery_locations").insert(locations);
        if (lError) {
            console.error(`    ❌ Locations failed: ${lError.message}`);
        } else {
            console.log(`    ✅ ${state.cities.length} cities added`);
        }
    }

    console.log("\n🎉 Seeding complete!");
}

seed().catch(console.error);
