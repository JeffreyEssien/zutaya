import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sb = createClient(url, key);

async function seed() {
    console.log("🔐 Seeding admin users...\n");

    const admins = [
        { email: "admin1@zutayang.com", name: "Admin One", password: "ZutaAdmin1!", role: "super_admin" },
        { email: "admin2@zutayang.com", name: "Admin Two", password: "ZutaAdmin2!", role: "admin" },
    ];

    for (const admin of admins) {
        const hash = await bcrypt.hash(admin.password, 12);
        const { error } = await sb.from("admin_users").upsert(
            { email: admin.email, name: admin.name, password_hash: hash, role: admin.role, is_active: true },
            { onConflict: "email" }
        );
        if (error) {
            console.error(`❌ ${admin.email}: ${error.message}`);
        } else {
            console.log(`✅ ${admin.email} (${admin.role}) — password: ${admin.password}`);
        }
    }

    console.log("\n🔐 Done. Store these credentials securely.");
}

seed().catch(console.error);
