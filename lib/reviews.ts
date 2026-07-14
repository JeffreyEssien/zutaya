import { getSupabaseServiceClient } from "@/lib/supabase";
import type { ProductReview, ReviewSummary } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toReview(row: any): ProductReview {
    return {
        id: row.id,
        productId: row.product_id,
        authorName: row.author_name,
        email: row.email || undefined,
        rating: Number(row.rating),
        title: row.title || undefined,
        body: row.body || undefined,
        status: row.status,
        verifiedPurchase: !!row.verified_purchase,
        createdAt: row.created_at,
    };
}

/** Has this email a PAID order containing this product? → "Verified Purchase". */
async function isVerifiedPurchase(email: string, productId: string): Promise<boolean> {
    try {
        const supabase = getSupabaseServiceClient();
        if (!supabase) return false;
        const { data } = await supabase
            .from("orders")
            .select("items")
            .ilike("email", email)
            .eq("payment_status", "payment_confirmed")
            .limit(50);
        for (const o of data || []) {
            const items = typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
            if (Array.isArray(items) && items.some((it: any) => it?.product?.id === productId)) return true;
        }
        return false;
    } catch {
        return false;
    }
}

export async function submitReview(input: {
    productId: string;
    authorName: string;
    email: string;
    rating: number;
    title?: string;
    body?: string;
}): Promise<{ ok: boolean; verifiedPurchase: boolean }> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) throw new Error("Database not available");

    const name = input.authorName?.trim();
    const email = input.email?.trim().toLowerCase();
    const rating = Math.round(Number(input.rating));

    if (!input.productId) throw new Error("Missing product");
    if (!name) throw new Error("Name is required");
    if (!email || !EMAIL_RE.test(email)) throw new Error("Invalid email address");
    if (!(rating >= 1 && rating <= 5)) throw new Error("Rating must be 1–5");

    const verified = await isVerifiedPurchase(email, input.productId);

    const { error } = await supabase.from("product_reviews").insert({
        product_id: input.productId,
        author_name: name.slice(0, 80),
        email,
        rating,
        title: input.title?.trim().slice(0, 120) || null,
        body: input.body?.trim().slice(0, 2000) || null,
        status: "pending",
        verified_purchase: verified,
    });
    if (error) throw error;
    return { ok: true, verifiedPurchase: verified };
}

/** Approved reviews for a product, newest first (storefront). */
export async function getApprovedReviews(productId: string): Promise<ProductReview[]> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return [];
    const { data } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
    return (data || []).map(toReview);
}

/** Aggregate rating over approved reviews (storefront + SEO aggregateRating). */
export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
    const supabase = getSupabaseServiceClient();
    const empty: ReviewSummary = { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    if (!supabase) return empty;
    const { data } = await supabase
        .from("product_reviews")
        .select("rating")
        .eq("product_id", productId)
        .eq("status", "approved");
    if (!data || data.length === 0) return empty;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of data) {
        const v = Number(r.rating);
        if (v >= 1 && v <= 5) { dist[v] += 1; sum += v; }
    }
    return { count: data.length, average: Math.round((sum / data.length) * 10) / 10, distribution: dist };
}

/* ── Admin ── */

export async function listReviews(status: "all" | "pending" | "approved" | "rejected" = "all"): Promise<ProductReview[]> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return [];
    let q = supabase.from("product_reviews").select("*").order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    return (data || []).map(toReview);
}

export async function moderateReview(id: string, status: "approved" | "rejected"): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) throw new Error("Database not available");
    const { error } = await supabase
        .from("product_reviews")
        .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
        .eq("id", id);
    if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) throw new Error("Database not available");
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) throw error;
}

/** Pending-review count — for the admin nav badge. */
export async function getPendingReviewCount(): Promise<number> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return 0;
    const { count } = await supabase
        .from("product_reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
    return count || 0;
}
