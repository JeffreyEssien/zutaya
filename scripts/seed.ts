/**
 * Seed script for ZúTa Ya — populates all core tables with real product data.
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

const uid = () => crypto.randomUUID();
const now = new Date().toISOString();

function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sku(prefix: string, idx: number) {
    return `${prefix}-${String(idx).padStart(3, "0")}`;
}

async function seed() {
    console.log("Seeding ZúTa Ya database...\n");

    // ── 0. Clear existing data (order matters for FK constraints) ──
    await sb.from("products").delete().neq("slug", "---");
    await sb.from("inventory_items").delete().neq("sku", "---");
    await sb.from("categories").delete().neq("slug", "---");
    await sb.from("orders").delete().neq("id", "---");
    console.log("🗑️  Cleared existing products, inventory, categories, orders");

    // ── 1. Categories ──
    const catIds: Record<string, string> = {
        "Cow Meat": uid(),
        "Goat Meat": uid(),
        "Ram Meat": uid(),
        "Poultry": uid(),
        "Premium Cut": uid(),
        "Snail": uid(),
        "Grillhouse": uid(),
    };

    const categories = [
        { id: catIds["Cow Meat"], name: "Cow Meat", slug: "cow-meat", image: "https://images.unsplash.com/photo-1588347818481-073d4cb66012?w=600", description: "Premium beef cuts — topside, ribs, oxtail, offals and more" },
        { id: catIds["Goat Meat"], name: "Goat Meat", slug: "goat-meat", image: "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=600", description: "Whole, half, quarter and boneless goat meat" },
        { id: catIds["Ram Meat"], name: "Ram Meat", slug: "ram-meat", image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600", description: "Whole ram, half, quarter and fresh ram cuts" },
        { id: catIds["Poultry"], name: "Poultry", slug: "poultry", image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600", description: "Chicken, turkey, guinea fowl — whole and parts" },
        { id: catIds["Premium Cut"], name: "Premium Cut", slug: "premium-cut", image: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=600", description: "Steaks, fillets, minced meat and suya" },
        { id: catIds["Snail"], name: "Snail", slug: "snail", image: "https://images.unsplash.com/photo-1621996659490-3275b4d0d951?w=600", description: "Jumbo, big, medium and small snails — fresh from the farm" },
        { id: catIds["Grillhouse"], name: "Grillhouse", slug: "grillhouse", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600", description: "Pre-grilled meats — goat, guinea fowl, chicken laps" },
    ];
    const { error: catErr } = await sb.from("categories").upsert(categories, { onConflict: "slug" });
    console.log(catErr ? `❌ Categories: ${catErr.message}` : `✅ Categories (${categories.length})`);

    // ── 2. Full product list from spreadsheet ──
    interface RawProduct {
        name: string;
        category: string;
        unit: string;
        costPrice: number;
        sellingPrice: number;
        startingQty: number | null; // null = preorder
        minQty: number | null;
        priceUnit: string;
        storageType: string;
        cutType: string | null;
        prepOptions: { id: string; label: string; extraFee: number }[];
    }

    const raw: RawProduct[] = [
        // ─── COW MEAT ───
        { name: "Topside Beef", category: "Cow Meat", unit: "1 KG", costPrice: 8500, sellingPrice: 11000, startingQty: 30, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Topside", prepOptions: [{ id: "trim", label: "Trim fat", extraFee: 0 }] },
        { name: "Topside Slab", category: "Cow Meat", unit: "1 KG", costPrice: 10000, sellingPrice: 14000, startingQty: 20, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Topside Slab", prepOptions: [{ id: "slice", label: "Slice into steaks", extraFee: 500 }] },
        { name: "Quarter Cow", category: "Cow Meat", unit: "Quarter", costPrice: 200000, sellingPrice: 250000, startingQty: 3, minQty: 1, priceUnit: "whole", storageType: "chilled", cutType: "Quarter", prepOptions: [{ id: "butcher", label: "Butcher into parts", extraFee: 0 }] },
        { name: "Shaki (Tripe)", category: "Cow Meat", unit: "Pack of 10", costPrice: 4500, sellingPrice: 7000, startingQty: 30, minQty: 5, priceUnit: "per_pack", storageType: "fresh", cutType: "Tripe", prepOptions: [{ id: "wash", label: "Deep clean & wash", extraFee: 0 }] },
        { name: "Kidney", category: "Cow Meat", unit: "1 Piece", costPrice: 4000, sellingPrice: 5500, startingQty: 20, minQty: 5, priceUnit: "per_piece", storageType: "fresh", cutType: "Kidney", prepOptions: [] },
        { name: "Liver", category: "Cow Meat", unit: "1 KG", costPrice: 8500, sellingPrice: 11000, startingQty: 10, minQty: 2, priceUnit: "per_kg", storageType: "fresh", cutType: "Liver", prepOptions: [{ id: "slice", label: "Slice thin", extraFee: 0 }] },
        { name: "Roundabout", category: "Cow Meat", unit: "1 KG", costPrice: 8500, sellingPrice: 10000, startingQty: 20, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Roundabout", prepOptions: [] },
        { name: "Full Cow Stomach", category: "Cow Meat", unit: "All Offals", costPrice: 90000, sellingPrice: 110000, startingQty: 6, minQty: 1, priceUnit: "whole", storageType: "fresh", cutType: "Offals", prepOptions: [{ id: "wash", label: "Deep clean & wash", extraFee: 0 }] },
        { name: "Bone Marrow", category: "Cow Meat", unit: "1 KG", costPrice: 3000, sellingPrice: 6000, startingQty: 50, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Bone Marrow", prepOptions: [] },
        { name: "Bone Marrow With Bone", category: "Cow Meat", unit: "1 KG", costPrice: 3000, sellingPrice: 6000, startingQty: 20, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Bone Marrow", prepOptions: [] },
        { name: "Cow Leg", category: "Cow Meat", unit: "1 Piece", costPrice: 10000, sellingPrice: 13000, startingQty: 20, minQty: 5, priceUnit: "per_piece", storageType: "fresh", cutType: "Leg", prepOptions: [{ id: "split", label: "Split in half", extraFee: 0 }] },
        { name: "Full Oxtail", category: "Cow Meat", unit: "Full", costPrice: 35000, sellingPrice: 45000, startingQty: 5, minQty: 1, priceUnit: "whole", storageType: "frozen", cutType: "Oxtail", prepOptions: [{ id: "cut", label: "Cut into pieces", extraFee: 0 }] },

        // ─── GOAT MEAT ───
        { name: "Full Goat", category: "Goat Meat", unit: "Whole", costPrice: 90000, sellingPrice: 120000, startingQty: 10, minQty: 2, priceUnit: "whole", storageType: "fresh", cutType: "Whole", prepOptions: [{ id: "butcher", label: "Butcher into parts", extraFee: 0 }] },
        { name: "Half Goat", category: "Goat Meat", unit: "Half", costPrice: 45000, sellingPrice: 60000, startingQty: 20, minQty: 5, priceUnit: "whole", storageType: "fresh", cutType: "Half", prepOptions: [{ id: "butcher", label: "Butcher into parts", extraFee: 0 }] },
        { name: "Quarter Goat", category: "Goat Meat", unit: "Quarter", costPrice: 22500, sellingPrice: 30000, startingQty: 30, minQty: 5, priceUnit: "whole", storageType: "fresh", cutType: "Quarter", prepOptions: [{ id: "butcher", label: "Butcher into parts", extraFee: 0 }] },
        { name: "Boneless Goat Meat", category: "Goat Meat", unit: "1 KG", costPrice: 10000, sellingPrice: 15000, startingQty: 30, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Boneless", prepOptions: [{ id: "dice", label: "Dice into cubes", extraFee: 0 }] },
        { name: "Goat Meat With Bone", category: "Goat Meat", unit: "1 KG", costPrice: 9000, sellingPrice: 12000, startingQty: 30, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Bone-in", prepOptions: [{ id: "cut", label: "Cut into pieces", extraFee: 0 }] },

        // ─── RAM MEAT ───
        { name: "Full Ram", category: "Ram Meat", unit: "Whole", costPrice: 180000, sellingPrice: 230000, startingQty: 10, minQty: 2, priceUnit: "whole", storageType: "fresh", cutType: "Whole", prepOptions: [{ id: "butcher", label: "Butcher into parts", extraFee: 0 }] },
        { name: "Half Ram", category: "Ram Meat", unit: "Half", costPrice: 90000, sellingPrice: 115000, startingQty: 20, minQty: 2, priceUnit: "whole", storageType: "fresh", cutType: "Half", prepOptions: [{ id: "butcher", label: "Butcher into parts", extraFee: 0 }] },
        { name: "Quarter Ram", category: "Ram Meat", unit: "Quarter", costPrice: 45000, sellingPrice: 57500, startingQty: 20, minQty: 3, priceUnit: "whole", storageType: "fresh", cutType: "Quarter", prepOptions: [{ id: "butcher", label: "Butcher into parts", extraFee: 0 }] },
        { name: "Ram Meat", category: "Ram Meat", unit: "1 KG", costPrice: 12000, sellingPrice: 17000, startingQty: 50, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: null, prepOptions: [{ id: "dice", label: "Dice into cubes", extraFee: 0 }] },

        // ─── POULTRY ───
        { name: "Chicken Broiler", category: "Poultry", unit: "Whole", costPrice: 17000, sellingPrice: 20000, startingQty: 10, minQty: 2, priceUnit: "whole", storageType: "fresh", cutType: "Whole Broiler", prepOptions: [{ id: "cut", label: "Cut into pieces", extraFee: 300 }] },
        { name: "Chicken Layers", category: "Poultry", unit: "Whole", costPrice: 11000, sellingPrice: 15000, startingQty: 10, minQty: 2, priceUnit: "whole", storageType: "fresh", cutType: "Whole Layer", prepOptions: [{ id: "cut", label: "Cut into pieces", extraFee: 300 }] },
        { name: "Chicken Laps (Carton)", category: "Poultry", unit: "1 Carton", costPrice: 50000, sellingPrice: 60000, startingQty: 20, minQty: 5, priceUnit: "per_pack", storageType: "frozen", cutType: "Laps", prepOptions: [] },
        { name: "Chicken Laps", category: "Poultry", unit: "1 KG", costPrice: 5000, sellingPrice: 6000, startingQty: 100, minQty: 10, priceUnit: "per_kg", storageType: "frozen", cutType: "Laps", prepOptions: [] },
        { name: "Boneless Chicken Breast", category: "Poultry", unit: "1 KG", costPrice: 6000, sellingPrice: 8000, startingQty: 50, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Breast", prepOptions: [{ id: "butterfly", label: "Butterfly fillet", extraFee: 0 }] },
        { name: "Chicken Gizzard", category: "Poultry", unit: "1 KG", costPrice: 6000, sellingPrice: 8000, startingQty: 20, minQty: 5, priceUnit: "per_kg", storageType: "fresh", cutType: "Gizzard", prepOptions: [] },
        { name: "Guinea Fowl", category: "Poultry", unit: "Whole", costPrice: 12000, sellingPrice: 16000, startingQty: 10, minQty: 2, priceUnit: "whole", storageType: "fresh", cutType: "Whole", prepOptions: [{ id: "cut", label: "Cut into pieces", extraFee: 300 }] },
        { name: "Turkey", category: "Poultry", unit: "Full Carton", costPrice: 100000, sellingPrice: 120000, startingQty: 5, minQty: 1, priceUnit: "per_pack", storageType: "frozen", cutType: "Whole", prepOptions: [] },

        // ─── PREMIUM CUT ───
        { name: "Beef Fillet", category: "Premium Cut", unit: "1 KG", costPrice: 10000, sellingPrice: 15000, startingQty: 10, minQty: 2, priceUnit: "per_kg", storageType: "chilled", cutType: "Fillet", prepOptions: [{ id: "trim", label: "Trim silver skin", extraFee: 0 }] },
        { name: "Minced Beef", category: "Premium Cut", unit: "1 KG", costPrice: 10000, sellingPrice: 12000, startingQty: 20, minQty: 5, priceUnit: "per_kg", storageType: "chilled", cutType: "Mince", prepOptions: [] },
        { name: "Minced Chicken", category: "Premium Cut", unit: "1 KG", costPrice: 8000, sellingPrice: 10000, startingQty: 20, minQty: 2, priceUnit: "per_kg", storageType: "chilled", cutType: "Mince", prepOptions: [] },
        { name: "Ribeye Steak", category: "Premium Cut", unit: "1 KG", costPrice: 10000, sellingPrice: 15000, startingQty: null, minQty: 2, priceUnit: "per_kg", storageType: "chilled", cutType: "Ribeye", prepOptions: [{ id: "tenderize", label: "Tenderize", extraFee: 0 }] },
        { name: "Sirloin Steak", category: "Premium Cut", unit: "1 KG", costPrice: 10000, sellingPrice: 15000, startingQty: null, minQty: 2, priceUnit: "per_kg", storageType: "chilled", cutType: "Sirloin", prepOptions: [{ id: "tenderize", label: "Tenderize", extraFee: 0 }] },
        { name: "Suya Stick", category: "Premium Cut", unit: "1 KG", costPrice: 8500, sellingPrice: 15000, startingQty: 20, minQty: 5, priceUnit: "per_kg", storageType: "fresh", cutType: "Suya", prepOptions: [] },
        { name: "T-Bone Steak", category: "Premium Cut", unit: "1 KG", costPrice: 12000, sellingPrice: 17000, startingQty: null, minQty: 1, priceUnit: "per_kg", storageType: "chilled", cutType: "T-Bone", prepOptions: [{ id: "tenderize", label: "Tenderize", extraFee: 0 }] },
        { name: "Tozo Steak", category: "Premium Cut", unit: "1 KG", costPrice: 10000, sellingPrice: 14000, startingQty: null, minQty: 2, priceUnit: "per_kg", storageType: "chilled", cutType: "Tozo", prepOptions: [{ id: "tenderize", label: "Tenderize", extraFee: 0 }] },

        // ─── SNAIL ───
        { name: "Jumbo Snails", category: "Snail", unit: "20 Pieces", costPrice: 65000, sellingPrice: 80000, startingQty: null, minQty: null, priceUnit: "per_pack", storageType: "fresh", cutType: null, prepOptions: [{ id: "clean", label: "Clean & deshell", extraFee: 0 }] },
        { name: "Big Snails", category: "Snail", unit: "20 Pieces", costPrice: 50000, sellingPrice: 75000, startingQty: null, minQty: null, priceUnit: "per_pack", storageType: "fresh", cutType: null, prepOptions: [{ id: "clean", label: "Clean & deshell", extraFee: 0 }] },
        { name: "Medium Snails", category: "Snail", unit: "20 Pieces", costPrice: 40000, sellingPrice: 60000, startingQty: null, minQty: null, priceUnit: "per_pack", storageType: "fresh", cutType: null, prepOptions: [{ id: "clean", label: "Clean & deshell", extraFee: 0 }] },
        { name: "Small Snails", category: "Snail", unit: "40 Pieces", costPrice: 25000, sellingPrice: 35000, startingQty: null, minQty: null, priceUnit: "per_pack", storageType: "fresh", cutType: null, prepOptions: [{ id: "clean", label: "Clean & deshell", extraFee: 0 }] },

        // ─── GRILLHOUSE ───
        { name: "Full Goat (Grilled)", category: "Grillhouse", unit: "Whole", costPrice: 150000, sellingPrice: 200000, startingQty: null, minQty: null, priceUnit: "whole", storageType: "fresh", cutType: "Grilled Whole Goat", prepOptions: [] },
        { name: "Guinea Fowl (Grilled)", category: "Grillhouse", unit: "Whole", costPrice: 10000, sellingPrice: 15000, startingQty: null, minQty: null, priceUnit: "whole", storageType: "fresh", cutType: "Grilled Guinea Fowl", prepOptions: [] },
        { name: "Chicken Laps (Grilled)", category: "Grillhouse", unit: "1 Carton", costPrice: 60000, sellingPrice: 80000, startingQty: null, minQty: null, priceUnit: "per_pack", storageType: "fresh", cutType: "Grilled Laps", prepOptions: [] },
    ];

    // ── 3. Inventory Items ──
    const inventoryItems = raw.map((p, i) => ({
        id: uid(),
        sku: sku(slugify(p.category).substring(0, 2).toUpperCase(), i + 1),
        name: p.name,
        cost_price: p.costPrice,
        selling_price: p.sellingPrice,
        stock: p.startingQty ?? 0,
        reorder_level: p.minQty ?? 1,
        supplier: "Zúta Ya Supply Chain",
    }));

    const { error: invErr } = await sb.from("inventory_items").upsert(inventoryItems, { onConflict: "sku" });
    console.log(invErr ? `❌ Inventory Items: ${invErr.message}` : `✅ Inventory Items (${inventoryItems.length})`);

    // ── 4. Products ──
    const products = raw.map((p, i) => {
        const slug = slugify(p.name);
        const isPreorder = p.startingQty === null;
        return {
            slug,
            name: p.name,
            description: `${p.name} — ${p.unit}. ${isPreorder ? "Available on preorder." : "In stock and ready to deliver."}`,
            price: p.sellingPrice,
            category: p.category,
            category_id: catIds[p.category],
            brand: "Zúta Ya",
            stock: p.startingQty ?? 0,
            images: [],
            variants: [],
            is_featured: [0, 3, 12, 21, 29, 33].includes(i),
            is_new: [1, 7, 15, 20, 30, 37].includes(i),
            inventory_item_id: inventoryItems[i].id,
            price_unit: p.priceUnit,
            cut_type: p.cutType,
            storage_type: p.storageType,
            min_weight_kg: p.priceUnit === "per_kg" ? 1.0 : null,
            prep_options: p.prepOptions,
        };
    });

    const { error: prodErr } = await sb.from("products").upsert(products, { onConflict: "slug" });
    console.log(prodErr ? `❌ Products: ${prodErr.message}` : `✅ Products (${products.length})`);

    // ── 5. Orders ──
    const orders = [
        {
            id: "ZY-20260417-0001", customer_name: "Adaeze Okafor", email: "adaeze@example.com", phone: "08012345678",
            items: [{ productId: slugify("Topside Beef"), name: "Topside Beef", variant: null, quantity: 2, price: 11000, image: "" }],
            subtotal: 22000, shipping: 2500, total: 24500, status: "delivered",
            shipping_address: { street: "12 Admiralty Way", city: "Lekki", state: "Lagos", zip: "" },
            payment_method: "bank_transfer", payment_status: "approved", delivery_zone: "Lekki", delivery_type: "doorstep",
        },
        {
            id: "ZY-20260417-0002", customer_name: "Chinedu Eze", email: "chinedu@example.com", phone: "07098765432",
            items: [{ productId: slugify("Chicken Broiler"), name: "Chicken Broiler", variant: null, quantity: 3, price: 20000, image: "" }],
            subtotal: 60000, shipping: 1500, total: 61500, status: "processing",
            shipping_address: { street: "45 Allen Avenue", city: "Ikeja", state: "Lagos", zip: "" },
            payment_method: "whatsapp", payment_status: "pending", delivery_zone: "Ikeja", delivery_type: "doorstep",
        },
        {
            id: "ZY-20260417-0003", customer_name: "Fatima Bello", email: "fatima@example.com", phone: "09011223344",
            items: [
                { productId: slugify("Full Goat"), name: "Full Goat", variant: null, quantity: 1, price: 120000, image: "" },
                { productId: slugify("Full Oxtail"), name: "Full Oxtail", variant: null, quantity: 1, price: 45000, image: "" },
            ],
            subtotal: 165000, shipping: 3000, total: 168000, status: "packed",
            shipping_address: { street: "7 Adeola Odeku", city: "Victoria Island", state: "Lagos", zip: "" },
            payment_method: "bank_transfer", payment_status: "approved", delivery_zone: "Victoria Island", delivery_type: "doorstep",
        },
        {
            id: "ZY-20260417-0004", customer_name: "Oluwaseun Adeyemi", email: "seun@example.com", phone: "08155667788",
            items: [{ productId: slugify("Ribeye Steak"), name: "Ribeye Steak", variant: null, quantity: 2, price: 15000, image: "" }],
            subtotal: 30000, shipping: 5000, total: 35000, status: "pending",
            shipping_address: { street: "22 Bode Thomas", city: "Surulere", state: "Lagos", zip: "" },
            payment_method: "whatsapp", payment_status: "pending", delivery_zone: "Mainland Core", delivery_type: "doorstep",
        },
        {
            id: "ZY-20260417-0005", customer_name: "Ngozi Mbachu", email: "ngozi@example.com", phone: "07033445566",
            items: [{ productId: slugify("Boneless Goat Meat"), name: "Boneless Goat Meat", variant: null, quantity: 3, price: 15000, image: "" }],
            subtotal: 45000, shipping: 2000, total: 47000, status: "out_for_delivery",
            shipping_address: { street: "15 Allen Avenue", city: "Ikeja", state: "Lagos", zip: "" },
            payment_method: "bank_transfer", payment_status: "approved", delivery_zone: "Ikeja", delivery_type: "doorstep",
        },
    ];
    const { error: ordErr } = await sb.from("orders").upsert(orders, { onConflict: "id" });
    console.log(ordErr ? `❌ Orders: ${ordErr.message}` : `✅ Orders (${orders.length})`);

    // ── 6. Coupons ──
    const coupons = [
        { code: "WELCOME10", discount_percent: 10, is_active: true, usage_count: 12 },
        { code: "MEAT20", discount_percent: 20, is_active: true, usage_count: 5 },
        { code: "LAGOS15", discount_percent: 15, is_active: true, usage_count: 8 },
        { code: "BUNDLE5", discount_percent: 5, is_active: true, usage_count: 22 },
        { code: "EXPIRED25", discount_percent: 25, is_active: false, usage_count: 3 },
    ];
    const { error: coupErr } = await sb.from("coupons").upsert(coupons, { onConflict: "code" });
    console.log(coupErr ? `❌ Coupons: ${coupErr.message}` : `✅ Coupons (${coupons.length})`);

    // ── 7. Delivery Zones ──
    const zoneIds = [uid(), uid(), uid(), uid(), uid()];
    const deliveryZones = [
        { id: zoneIds[0], name: "Lekki / Ajah", zone_type: "lagos", base_fee: 2500, is_active: true, sort_order: 1, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[1], name: "Victoria Island / Ikoyi", zone_type: "lagos", base_fee: 2000, is_active: true, sort_order: 2, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[2], name: "Ikeja / Maryland", zone_type: "lagos", base_fee: 1500, is_active: true, sort_order: 3, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[3], name: "Surulere / Yaba", zone_type: "lagos", base_fee: 2000, is_active: true, sort_order: 4, hub_estimate: null, doorstep_estimate: "Same day" },
        { id: zoneIds[4], name: "Ikorodu / Mainland Extension", zone_type: "lagos", base_fee: 3500, is_active: true, sort_order: 5, hub_estimate: null, doorstep_estimate: "1–2 days" },
    ];
    const { error: zoneErr } = await sb.from("delivery_zones").upsert(deliveryZones);
    console.log(zoneErr ? `❌ Delivery Zones: ${zoneErr.message}` : `✅ Delivery Zones (${deliveryZones.length})`);

    // ── 8. Delivery Locations ──
    const deliveryLocations = [
        { zone_id: zoneIds[0], name: "Lekki Phase 1", doorstep_fee: 2500, is_active: true },
        { zone_id: zoneIds[0], name: "Ajah", doorstep_fee: 3000, is_active: true },
        { zone_id: zoneIds[1], name: "Victoria Island", doorstep_fee: 2000, is_active: true },
        { zone_id: zoneIds[2], name: "Ikeja GRA", doorstep_fee: 1500, is_active: true },
        { zone_id: zoneIds[4], name: "Ikorodu", doorstep_fee: 3500, is_active: true },
    ];
    const { error: locErr } = await sb.from("delivery_locations").upsert(deliveryLocations);
    console.log(locErr ? `❌ Delivery Locations: ${locErr.message}` : `✅ Delivery Locations (${deliveryLocations.length})`);

    // ── 9. Bundle Rules ──
    const bundleRules = [
        { name: "Starter Box", description: "Try a little bit of everything — perfect for first-timers.", min_items: 3, max_items: 5, discount_percent: 10, is_active: true, allowed_category_ids: [] },
        { name: "Family Feast", description: "Feed the whole family for the week with premium cuts.", min_items: 5, max_items: 10, discount_percent: 15, is_active: true, allowed_category_ids: [] },
        { name: "BBQ Bundle", description: "Everything you need for an epic grill session.", min_items: 4, max_items: 8, discount_percent: 12, is_active: true, allowed_category_ids: [catIds["Cow Meat"], catIds["Poultry"], catIds["Grillhouse"]] },
        { name: "Protein Pack", description: "High-protein selections for meal prep and fitness.", min_items: 3, max_items: 6, discount_percent: 8, is_active: true, allowed_category_ids: [] },
        { name: "Soup Essentials", description: "All the cuts you need for your soups and stews.", min_items: 3, max_items: 7, discount_percent: 10, is_active: true, allowed_category_ids: [catIds["Cow Meat"], catIds["Goat Meat"]] },
    ];
    const { error: bundleErr } = await sb.from("bundle_rules").upsert(bundleRules);
    console.log(bundleErr ? `❌ Bundle Rules: ${bundleErr.message}` : `✅ Bundle Rules (${bundleRules.length})`);

    // ── 10. Newsletter Subscribers ──
    const subscribers = [
        { email: "adaeze@example.com", first_name: "Adaeze", token: uid(), source: "footer" },
        { email: "chinedu@example.com", first_name: "Chinedu", token: uid(), source: "footer" },
        { email: "fatima@example.com", first_name: "Fatima", token: uid(), source: "footer" },
        { email: "seun@example.com", first_name: "Oluwaseun", token: uid(), source: "footer" },
        { email: "ngozi@example.com", first_name: "Ngozi", token: uid(), source: "checkout" },
    ];
    const { error: subErr } = await sb.from("newsletter_subscribers").upsert(subscribers, { onConflict: "email" });
    console.log(subErr ? `❌ Newsletter Subscribers: ${subErr.message}` : `✅ Newsletter Subscribers (${subscribers.length})`);

    // ── 11. Site Settings (singleton) ──
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
        about_stats: [
            { value: "500+", label: "Happy Customers" },
            { value: "24hrs", label: "Max Delivery Time" },
            { value: "100%", label: "Cold-Chain Packed" },
            { value: "6", label: "Days a Week" },
        ],
        footer_tagline: "Premium meat delivery across Lagos and Nigeria.",
        free_shipping_threshold: 50000,
        custom_texts: {},
    };
    const { error: settErr } = await sb.from("site_settings").upsert(siteSettings);
    console.log(settErr ? `❌ Site Settings: ${settErr.message}` : "✅ Site Settings");

    console.log("\n🎉 Seed complete!");
}

seed().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
