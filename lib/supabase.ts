import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.warn("⚠️  Supabase env vars not set — returning null client");
        return null;
    }

    client = createClient(url, key);
    return client;
}

export function getSupabaseServiceClient(): SupabaseClient | null {
    if (serviceClient) return serviceClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.warn("⚠️  Supabase service role env vars not set — returning null client");
        return null;
    }

    serviceClient = createClient(url, key);
    return serviceClient;
}
