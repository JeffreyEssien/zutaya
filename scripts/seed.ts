/**
 * Seed script for ZúTa Ya — inserts 5 sample rows into each core table.
 * Run: npx tsx scripts/seed.ts
 * Uses SUPABASE_SERVICE_ROLE_KEY for full write access (bypasses RLS).
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

const sb = createClient(url, key);

// Helpers
const uid = () => crypto.randomUUID();
const now = new Date().toISOString();

async function seed() {
    console.log("Seeding ZúTa Ya database...\n");

    // ── 1. Categories ──
    const catIds = [uid(), uid(), uid(), uid(), uid()];
    const categories = [
        { id: catIds[0], name: "Beef", slug: "beef", image: "https://images.unsplash.com/photo-1588347818481-073d4cb66012?w=600", description: "Premium beef cuts — steaks, ribs, mince and more" },
        { id: catIds[1], name: "Chicken", slug: "chicken", image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600", description: "Whole chickens, breast fillets, drumsticks and wings" },
        { id: catIds[2], name: "Goat Meat", slug: "goat-meat", image: "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=600", description: "Fresh goat cuts for soups, stews and asun" },
        { id: catIds[3], name: "Fish & Seafood", slug: "fish-seafood", image: "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600", description: "Fresh and frozen fish, prawns and seafood" },
        { id: catIds[4], name: "Offal & Extras", slug: "offal-extras", image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600", description: "Liver, kidney, tripe, oxtail and specialty cuts" },
    ];
    const { error: catErr } = await sb.from("categories").upsert(categories, { onConflict: "slug" });
    console.log(catErr ? `❌ Categories: ${catErr.message}` : "✅ Categories (5)");

    // ── 2. Inventory Items ──
    const invIds = [uid(), uid(), uid(), uid(), uid()];
    const inventoryItems = [
        { id: invIds[0], sku: "BF-RIB-001", name: "Beef Short Ribs", cost_price: 4500, selling_price: 7500, stock: 25, reorder_level: 5, supplier: "Lagos Meats Co" },
        { id: invIds[1], sku: "CK-WHL-001", name: "Whole Chicken (1.5kg)", cost_price: 3000, selling_price: 5200, stock: 40, reorder_level: 10, supplier: "FreshFarm Poultry" },
        { id: invIds[2], sku: "GT-LEG-001", name: "Goat Leg", cost_price: 5000, selling_price: 8500, stock: 15, reorder_level: 3, supplier: "Northern Livestock" },
        { id: invIds[3], sku: "FS-PRN-001", name: "Tiger Prawns (500g)", cost_price: 4000, selling_price: 6800, stock: 20, reorder_level: 5, supplier: "Atlantic Seafood" },
        { id: invIds[4], sku: "OF-OXT-001", name: "Oxtail (1kg)", cost_price: 5500, selling_price: 9000, stock: 12, reorder_level: 3, supplier: "Lagos Meats Co" },
    ];
    const { error: invErr } = await sb.from("inventory_items").upsert(inventoryItems, { onConflict: "sku" });
    console.log(invErr ? `❌ Inventory Items: ${invErr.message}` : "✅ Inventory Items (5)");

    // ── 3. Products ──
    const products = [
        {
            slug: "beef-short-ribs", name: "Beef Short Ribs", description: "Juicy, marbled short ribs perfect for slow cooking, grilling or braising. Cut fresh and cold-chain packed.",
            price: 7500, category: "Beef", category_id: catIds[0], brand: "Zúta Ya", stock: 25, images: ["https://images.unsplash.com/photo-1588347818481-073d4cb66012?w=600", "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=600"],
            variants: [{ name: "500g", price: 3750, stock: 15 }, { name: "1kg", price: 7500, stock: 10 }],
            is_featured: true, is_new: true, inventory_item_id: invIds[0], price_unit: "per_kg", cut_type: "Short Ribs", storage_type: "chilled", min_weight_kg: 0.5,
            prep_options: ([{ id: "trim", label: "Trim fat", extraFee: 0 }, { id: "debone", label: "Debone", extraFee: 500 }]),
        },
        {
            slug: "whole-chicken", name: "Whole Chicken (1.5kg)", description: "Farm-raised whole chicken, cleaned and ready to cook. Ideal for roasting, grilling or making stock.",
            price: 5200, category: "Chicken", category_id: catIds[1], brand: "Zúta Ya", stock: 40, images: ["https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600"],
            variants: [], is_featured: true, is_new: false, inventory_item_id: invIds[1], price_unit: "whole", cut_type: null, storage_type: "fresh", min_weight_kg: 1.5,
            prep_options: ([{ id: "cut", label: "Cut into pieces", extraFee: 300 }]),
        },
        {
            slug: "goat-leg", name: "Goat Leg", description: "Tender goat leg, great for peppersoup, asun or slow-roasted dishes. Sourced from trusted Northern suppliers.",
            price: 8500, category: "Goat Meat", category_id: catIds[2], brand: "Zúta Ya", stock: 15, images: ["https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=600"],
            variants: [{ name: "Half Leg", price: 4500, stock: 8 }, { name: "Full Leg", price: 8500, stock: 7 }],
            is_featured: false, is_new: true, inventory_item_id: invIds[2], price_unit: "per_piece", cut_type: "Leg", storage_type: "fresh", min_weight_kg: 1.0,
            prep_options: [],
        },
        {
            slug: "tiger-prawns-500g", name: "Tiger Prawns (500g)", description: "Large wild-caught tiger prawns, deveined and shell-on. Flash-frozen for maximum freshness.",
            price: 6800, category: "Fish & Seafood", category_id: catIds[3], brand: "Zúta Ya", stock: 20, images: ["https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600"],
            variants: [], is_featured: true, is_new: true, inventory_item_id: invIds[3], price_unit: "per_pack", cut_type: null, storage_type: "frozen", min_weight_kg: 0.5,
            prep_options: ([{ id: "peel", label: "Peel & devein", extraFee: 500 }]),
        },
        {
            slug: "oxtail-1kg", name: "Oxtail (1kg)", description: "Rich, gelatinous oxtail — perfect for stews, peppersoup and jollof. A Nigerian kitchen essential.",
            price: 9000, category: "Offal & Extras", category_id: catIds[4], brand: "Zúta Ya", stock: 12, images: ["https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600"],
            variants: [{ name: "500g", price: 4500, stock: 6 }, { name: "1kg", price: 9000, stock: 6 }],
            is_featured: false, is_new: false, inventory_item_id: invIds[4], price_unit: "per_kg", cut_type: "Oxtail", storage_type: "frozen", min_weight_kg: 0.5,
            prep_options: [],
        },
    ];
    const { error: prodErr } = await sb.from("products").upsert(products, { onConflict: "slug" });
    console.log(prodErr ? `❌ Products: ${prodErr.message}` : "✅ Products (5)");

    // ── 4. Orders ──
    const orders = [
        {
            id: "ZY-00001", customer_name: "Adaeze Okafor", email: "adaeze@example.com", phone: "08012345678",
            items: ([{ productId: "beef-short-ribs", name: "Beef Short Ribs", variant: "1kg", quantity: 2, price: 7500, image: "" }]),
            subtotal: 15000, shipping: 2500, total: 17500, status: "delivered",
            shipping_address: ({ street: "12 Admiralty Way", city: "Lekki", state: "Lagos", zip: "" }),
            payment_method: "bank_transfer", payment_status: "approved", delivery_zone: "Lekki", delivery_type: "doorstep",
        },
        {
            id: "ZY-00002", customer_name: "Chinedu Eze", email: "chinedu@example.com", phone: "07098765432",
            items: ([{ productId: "whole-chicken", name: "Whole Chicken (1.5kg)", variant: null, quantity: 3, price: 5200, image: "" }]),
            subtotal: 15600, shipping: 1500, total: 17100, status: "processing",
            shipping_address: ({ street: "45 Allen Avenue", city: "Ikeja", state: "Lagos", zip: "" }),
            payment_method: "whatsapp", payment_status: "pending", delivery_zone: "Ikeja", delivery_type: "doorstep",
        },
        {
            id: "ZY-00003", customer_name: "Fatima Bello", email: "fatima@example.com", phone: "09011223344",
            items: ([
                { productId: "goat-leg", name: "Goat Leg", variant: "Full Leg", quantity: 1, price: 8500, image: "" },
                { productId: "oxtail-1kg", name: "Oxtail (1kg)", variant: "1kg", quantity: 1, price: 9000, image: "" },
            ]),
            subtotal: 17500, shipping: 3000, total: 20500, status: "packed",
            shipping_address: ({ street: "7 Adeola Odeku", city: "Victoria Island", state: "Lagos", zip: "" }),
            payment_method: "bank_transfer", payment_status: "approved", delivery_zone: "Victoria Island", delivery_type: "doorstep",
        },
        {
            id: "ZY-00004", customer_name: "Oluwaseun Adeyemi", email: "seun@example.com", phone: "08155667788",
            items: ([{ productId: "tiger-prawns-500g", name: "Tiger Prawns (500g)", variant: null, quantity: 2, price: 6800, image: "" }]),
            subtotal: 13600, shipping: 5000, total: 18600, status: "pending",
            shipping_address: ({ street: "22 Allen Avenue", city: "Ikeja", state: "Lagos", zip: "" }),
            payment_method: "whatsapp", payment_status: "pending", delivery_zone: "Mainland Core", delivery_type: "doorstep",
        },
        {
            id: "ZY-00005", customer_name: "Ngozi Mbachu", email: "ngozi@example.com", phone: "07033445566",
            items: ([{ productId: "beef-short-ribs", name: "Beef Short Ribs", variant: "500g", quantity: 4, price: 3750, image: "" }]),
            subtotal: 15000, shipping: 2000, total: 17000, status: "out_for_delivery",
            shipping_address: ({ street: "15 Bode Thomas", city: "Surulere", state: "Lagos", zip: "" }),
            payment_method: "bank_transfer", payment_status: "approved", delivery_zone: "Surulere", delivery_type: "doorstep",
        },
    ];
    const { error: ordErr } = await sb.from("orders").upsert(orders, { onConflict: "id" });
    console.log(ordErr ? `❌ Orders: ${ordErr.message}` : "✅ Orders (5)");

    // ── 5. Coupons ──
    const coupons = [
        { code: "WELCOME10", discount_percent: 10, is_active: true, usage_count: 12 },
        { code: "MEAT20", discount_percent: 20, is_active: true, usage_count: 5 },
        { code: "LAGOS15", discount_percent: 15, is_active: true, usage_count: 8 },
        { code: "BUNDLE5", discount_percent: 5, is_active: true, usage_count: 22 },
        { code: "EXPIRED25", discount_percent: 25, is_active: false, usage_count: 3 },
    ];
    const { error: coupErr } = await sb.from("coupons").upsert(coupons, { onConflict: "code" });
    console.log(coupErr ? `❌ Coupons: ${coupErr.message}` : "✅ Coupons (5)");

    // ── 6. Delivery Zones ──
    const zoneIds = [uid(), uid(), uid(), uid(), uid()];
    const deliveryZones = [
        { id: zoneIds[0], name: "Lekki / Ajah", zone_type: "lagos", base_fee: 2500, is_active: true, sort_order: 1, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[1], name: "Victoria Island / Ikoyi", zone_type: "lagos", base_fee: 2000, is_active: true, sort_order: 2, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[2], name: "Ikeja / Maryland", zone_type: "lagos", base_fee: 1500, is_active: true, sort_order: 3, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[3], name: "Surulere / Yaba", zone_type: "lagos", base_fee: 2000, is_active: true, sort_order: 4, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[4], name: "Ikorodu / Mainland Extension", zone_type: "lagos", base_fee: 3500, is_active: true, sort_order: 5, hub_estimate: null, doorstep_estimate: "1–2 days" },
    ];
    const { error: zoneErr } = await sb.from("delivery_zones").upsert(deliveryZones);
    console.log(zoneErr ? `❌ Delivery Zones: ${zoneErr.message}` : "✅ Delivery Zones (5)");

    // ── 7. Delivery Locations ──
    const deliveryLocations = [
        { zone_id: zoneIds[0], name: "Lekki Phase 1", doorstep_fee: 2500, is_active: true },
        { zone_id: zoneIds[0], name: "Ajah", doorstep_fee: 3000, is_active: true },
        { zone_id: zoneIds[1], name: "Victoria Island", doorstep_fee: 2000, is_active: true },
        { zone_id: zoneIds[2], name: "Ikeja GRA", doorstep_fee: 1500, is_active: true },
        { zone_id: zoneIds[4], name: "Ibadan", hub_pickup_fee: 3500, doorstep_fee: 5000, is_active: true },
    ];
    const { error: locErr } = await sb.from("delivery_locations").upsert(deliveryLocations);
    console.log(locErr ? `❌ Delivery Locations: ${locErr.message}` : "✅ Delivery Locations (5)");

    // ── 8. Bundle Rules ──
    const bundleRules = [
        { name: "Starter Box", description: "Try a little bit of everything — perfect for first-timers.", min_items: 3, max_items: 5, discount_percent: 10, is_active: true, allowed_category_ids: [] },
        { name: "Family Feast", description: "Feed the whole family for the week with premium cuts.", min_items: 5, max_items: 10, discount_percent: 15, is_active: true, allowed_category_ids: [] },
        { name: "BBQ Bundle", description: "Everything you need for an epic grill session.", min_items: 4, max_items: 8, discount_percent: 12, is_active: true, allowed_category_ids: [catIds[0], catIds[1]] },
        { name: "Protein Pack", description: "High-protein selections for meal prep and fitness.", min_items: 3, max_items: 6, discount_percent: 8, is_active: true, allowed_category_ids: [] },
        { name: "Soup Essentials", description: "All the cuts you need for your soups and stews.", min_items: 3, max_items: 7, discount_percent: 10, is_active: true, allowed_category_ids: [catIds[2], catIds[4]] },
    ];
    const { error: bundleErr } = await sb.from("bundle_rules").upsert(bundleRules);
    console.log(bundleErr ? `❌ Bundle Rules: ${bundleErr.message}` : "✅ Bundle Rules (5)");

    // ── 9. Newsletter Subscribers ──
    const subscribers = [
        { email: "adaeze@example.com", first_name: "Adaeze", token: uid(), source: "footer" },
        { email: "chinedu@example.com", first_name: "Chinedu", token: uid(), source: "footer" },
        { email: "fatima@example.com", first_name: "Fatima", token: uid(), source: "footer" },
        { email: "seun@example.com", first_name: "Oluwaseun", token: uid(), source: "footer" },
        { email: "ngozi@example.com", first_name: "Ngozi", token: uid(), source: "checkout" },
    ];
    const { error: subErr } = await sb.from("newsletter_subscribers").upsert(subscribers, { onConflict: "email" });
    console.log(subErr ? `❌ Newsletter Subscribers: ${subErr.message}` : "✅ Newsletter Subscribers (5)");

    // ── 10. Site Settings (singleton) ──
    const siteSettings = {
        id: true,
        site_name: "Zúta Ya",
        hero_heading: "Premium Meat. Delivered Fresh.",
        hero_subheading: "Fresh, chilled, and frozen cuts sourced from trusted suppliers — cold-chain packed and delivered to your door in Lagos.",
        hero_cta_text: "Shop Now",
        hero_cta_link: "/shop",
        our_story_heading: "From the Market to Your Kitchen",
        our_story_text: "Zúta Ya was born from a simple belief: every home in Lagos deserves access to premium, fresh meat — delivered with care and cold-chain integrity.\n\nWe source the finest cuts directly from trusted suppliers. Every piece is inspected, properly stored, and delivered cold-chain packed to your door.",
        announcement_bar_enabled: true,
        announcement_bar_text: "Free delivery on orders over ₦50,000 🚚",
        announcement_bar_color: "#8B0000",
        social_instagram: "https://instagram.com/zuutaya",
        business_phone: "07042038491",
        business_whatsapp: "2347042038491",
        business_address: "Lagos, Nigeria",
        about_promise_text: "Every order is packed with care, kept cold, and delivered fresh. If it doesn't meet your standards, we'll make it right — no questions asked.",
        about_quote: "More than meat delivery. It's freshness. It's trust. It's Zúta Ya.",
        about_stats: ([
            { value: "500+", label: "Happy Customers" },
            { value: "24hrs", label: "Max Delivery Time" },
            { value: "100%", label: "Cold-Chain Packed" },
            { value: "6", label: "Days a Week" },
        ]),
        footer_tagline: "Premium meat delivery across Lagos and Nigeria.",
        free_shipping_threshold: 50000,
        custom_texts: {},
    };
    const { error: settErr } = await sb.from("site_settings").upsert(siteSettings);
    console.log(settErr ? `❌ Site Settings: ${settErr.message}` : "✅ Site Settings");

    console.log("\n🎉 Seed complete!");
}

seed().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
