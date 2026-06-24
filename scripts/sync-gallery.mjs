/**
 * Backfill the media gallery from product images.
 *
 * Inserts a `media` row for every product image URL (images[] + imageCooked +
 * imageEvent) that isn't already in the gallery, labelled with the product name.
 * Additive + idempotent: de-dupes by URL (existing rows AND within this run), so
 * it's safe to re-run. Never deletes anything.
 *
 *   node scripts/sync-gallery.mjs --dry   # preview, insert nothing
 *   node scripts/sync-gallery.mjs         # apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  (env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1] || "").trim().replace(/^["']|["']$/g, "");

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, key);
const DRY = process.argv.includes("--dry");

/** Extract a Cloudinary public_id from a delivery URL (best-effort, else null). */
function publicIdFromCloudinary(u) {
  const m = u.match(
    /res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/,
  );
  return m ? m[1] : null;
}

const { data: media, error: mErr } = await sb.from("media").select("url");
if (mErr) {
  console.error("Failed to read media:", mErr.message);
  process.exit(1);
}
const existing = new Set((media || []).map((m) => m.url));

// select("*") so missing optional columns (image_cooked/image_event) never error.
const { data: products, error: pErr } = await sb.from("products").select("*");
if (pErr) {
  console.error("Failed to read products:", pErr.message);
  process.exit(1);
}

const seen = new Set();
const toInsert = [];
for (const p of products || []) {
  let imgs = p.images;
  if (typeof imgs === "string") {
    try {
      imgs = JSON.parse(imgs);
    } catch {
      imgs = [];
    }
  }
  const urls = [...(Array.isArray(imgs) ? imgs : []), p.image_cooked, p.image_event]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  for (const imgUrl of urls) {
    if (existing.has(imgUrl) || seen.has(imgUrl)) continue;
    seen.add(imgUrl);
    toInsert.push({
      url: imgUrl,
      public_id: publicIdFromCloudinary(imgUrl),
      type: "image",
      name: p.name || "Product image",
      folder: "zutaya",
    });
  }
}

console.log(
  `Products: ${products?.length || 0}  ·  existing gallery rows: ${existing.size}  ·  new images to add: ${toInsert.length}`,
);

if (toInsert.length === 0) {
  console.log("✅ Gallery already in sync — nothing to add.");
  process.exit(0);
}
if (DRY) {
  console.log("(dry run — nothing inserted) sample:");
  for (const r of toInsert.slice(0, 8)) console.log(`  • ${r.name} → ${r.url}`);
  process.exit(0);
}

let added = 0;
for (let i = 0; i < toInsert.length; i += 200) {
  const batch = toInsert.slice(i, i + 200);
  const { error } = await sb.from("media").insert(batch);
  if (error) {
    console.error(`Insert failed at batch ${i}:`, error.message);
    process.exit(1);
  }
  added += batch.length;
}
console.log(`✅ Added ${added} product image(s) to the gallery.`);
