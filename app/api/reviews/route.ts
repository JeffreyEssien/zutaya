/**
 * POST /api/reviews  (public) — submit a product review (lands as 'pending').
 * Body: { productId, authorName, email, rating, title?, body? }
 */
import { NextResponse } from "next/server";
import { submitReview } from "@/lib/reviews";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const b = await request.json();
        const result = await submitReview({
            productId: String(b.productId || ""),
            authorName: String(b.authorName || ""),
            email: String(b.email || ""),
            rating: Number(b.rating),
            title: b.title ? String(b.title) : undefined,
            body: b.body ? String(b.body) : undefined,
        });
        return NextResponse.json({ success: true, verifiedPurchase: result.verifiedPurchase });
    } catch (err: any) {
        const known = ["Name is required", "Invalid email address", "Rating must be 1–5", "Missing product"];
        const msg = known.includes(err?.message) ? err.message : "Could not submit review";
        const status = known.includes(err?.message) ? 400 : 500;
        return NextResponse.json({ success: false, error: msg }, { status });
    }
}
