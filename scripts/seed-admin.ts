import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedAdmin() {
  console.log(`Seeding admin user: ${ADMIN_EMAIL}`);

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const { data, error } = await supabase
    .from("admin_users")
    .upsert(
      {
        email: ADMIN_EMAIL.toLowerCase().trim(),
        name: ADMIN_NAME,
        password_hash: hash,
        role: "super_admin",
        is_active: true,
      },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }

  console.log("Admin user created/updated successfully:");
  console.log(`  Email: ${data.email}`);
  console.log(`  Name: ${data.name}`);
  console.log(`  Role: ${data.role}`);
}

seedAdmin();
