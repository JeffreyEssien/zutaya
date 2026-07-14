/**
 * Admin review moderation.
 *   GET    /api/admin/reviews?status=all|pending|approved|rejected
 *   POST   /api/admin/reviews   { id, action: "approve" | "reject" }
 *   DELETE /api/admin/reviews   { id }
 */
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { listReviews, moderateReview, deleteReview } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const status = (new URL(request.url).searchParams.get("status") || "all") as any;
    const reviews = await listReviews(status);
    return NextResponse.json({ success: true, reviews });
}

export async function POST(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const b = await request.json();
    const id = String(b.id || "");
    const action = b.action === "approve" ? "approved" : b.action === "reject" ? "rejected" : null;
    if (!id || !action) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    await moderateReview(id, action);
    return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const b = await request.json();
    const id = String(b.id || "");
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    await deleteReview(id);
    return NextResponse.json({ success: true });
}
