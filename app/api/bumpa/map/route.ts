/**
 * POST /api/bumpa/map — admin only. Map a Bumpa product id → a zutaya product
 * (optionally a specific variant) so its order lines auto-match on the next sync.
 * Body: { bumpaProductId, productId, bumpaVariationId?, variantName?, label? }
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { upsertBumpaProductMap } from "@/lib/bumpaSync";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    const bumpaProductId = String(body.bumpaProductId ?? "").trim();
    const productId = String(body.productId ?? "").trim();
    if (!bumpaProductId || !productId) {
        return NextResponse.json(
            { success: false, error: "bumpaProductId and productId are required" },
            { status: 400 },
        );
    }
    try {
        await upsertBumpaProductMap({
            bumpaProductId,
            bumpaVariationId: body.bumpaVariationId ? String(body.bumpaVariationId) : null,
            productId,
            variantName: body.variantName ? String(body.variantName) : null,
            label: body.label ? String(body.label) : null,
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Failed to save mapping" },
            { status: 500 },
        );
    }
    return NextResponse.json({ success: true });
}
