/**
 * Syncs all existing images from products, categories, and site settings
 * into the media gallery table with proper labels.
 * Run: npx tsx scripts/sync-media.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

const sb = createClient(url, key);

interface MediaRecord {
    url: string;
    name: string;
    public_id: string | null;
    type: "image" | "video";
    folder: string;
}

function extractPublicId(cloudinaryUrl: string): string | null {
    // e.g. https://res.cloudinary.com/drsirvpm3/image/upload/v1776.../zutaya/abc123.jpg
    const match = cloudinaryUrl.match(/\/upload\/v\d+\/(.+)\.\w+$/);
    return match ? match[1] : null;
}

function getExtLabel(url: string): string {
    if (url.includes("unsplash.com")) return "Unsplash";
    if (url.includes("cloudinary.com")) return "Cloudinary";
    return "External";
}

async function syncMedia() {
    console.log("Syncing existing images to media gallery...\n");

    // Collect all unique URLs with labels
    const records: MediaRecord[] = [];
    const seen = new Set<string>();

    function add(url: string, name: string) {
        if (!url || seen.has(url)) return;
        seen.add(url);
        records.push({
            url,
            name,
            public_id: extractPublicId(url),
            type: "image",
            folder: url.includes("cloudinary") ? "zutaya" : "external",
        });
    }

    // 1. Products
    const { data: products } = await sb.from("products").select("name, images");
    for (const p of products || []) {
        const imgs = Array.isArray(p.images) ? p.images : [];
        imgs.forEach((img: string, i: number) => {
            const label = imgs.length === 1
                ? `${p.name}`
                : `${p.name} (${i + 1})`;
            add(img, label);
        });
    }
    console.log(`  Products: ${products?.length || 0} products scanned`);

    // 2. Categories
    const { data: cats } = await sb.from("categories").select("name, image");
    for (const c of cats || []) {
        if (c.image) add(c.image, `Category — ${c.name}`);
    }
    console.log(`  Categories: ${cats?.length || 0} categories scanned`);

    // 3. Site settings
    const { data: ss } = await sb.from("site_settings").select("hero_image, logo_url, favicon_url").eq("id", true).single();
    if (ss?.hero_image) add(ss.hero_image, "Hero Image");
    if (ss?.logo_url) add(ss.logo_url, "Site Logo");
    if (ss?.favicon_url) add(ss.favicon_url, "Favicon");
    console.log(`  Site settings: scanned`);

    console.log(`\n  Total unique images found: ${records.length}`);

    if (records.length === 0) {
        console.log("\n  Nothing to sync.");
        return;
    }

    // Check which URLs already exist in media table
    const { data: existing } = await sb.from("media").select("url");
    const existingUrls = new Set((existing || []).map((m: any) => m.url));

    const toInsert = records.filter((r) => !existingUrls.has(r.url));
    console.log(`  Already in gallery: ${records.length - toInsert.length}`);
    console.log(`  New to add: ${toInsert.length}\n`);

    if (toInsert.length === 0) {
        console.log("  All images already synced!");
        return;
    }

    // Insert in batches of 20
    for (let i = 0; i < toInsert.length; i += 20) {
        const batch = toInsert.slice(i, i + 20);
        const { error } = await sb.from("media").insert(batch);
        if (error) {
            console.error(`  ❌ Batch ${i / 20 + 1}: ${error.message}`);
        } else {
            console.log(`  ✅ Batch ${i / 20 + 1}: inserted ${batch.length} items`);
            for (const r of batch) {
                console.log(`     → ${r.name}`);
            }
        }
    }

    console.log("\n🎉 Media sync complete!");
}

syncMedia().catch((e) => { console.error("Sync failed:", e); process.exit(1); });
