/**
 * GET /api/admin/payments/list  (admin-only)
 *
 * Query params (all optional):
 *   status   = pending | paid | failed | abandoned | refunded | partially_refunded
 *   search   = matches reference, customer_email, order_id (ILIKE)
 *   limit    = default 50, max 200
 *   offset   = default 0
 *   dateFrom = ISO date
 *   dateTo   = ISO date
 *
 * Returns: { success, total, payments }
 */

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
        return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim();
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const offset = Number(url.searchParams.get("offset") || 0);

    let q = supabase
        .from("payments")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (status && status !== "all") q = q.eq("status", status);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo) q = q.lte("created_at", dateTo);
    if (search) {
        // ILIKE search across reference, email, order_id
        const term = `%${search}%`;
        q = q.or(`reference.ilike.${term},customer_email.ilike.${term},order_id.ilike.${term}`);
    }

    const { data, error, count } = await q;
    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // KPI aggregates for the page header
    const today = new Date().toISOString().slice(0, 10);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: agg } = await supabase
        .from("payments")
        .select("status, total_charged_kobo, paystack_fees_kobo")
        .gte("created_at", since30);

    const summary = {
        total30dCount: agg?.length ?? 0,
        paid30dCount: agg?.filter((p) => p.status === "paid").length ?? 0,
        failed30dCount: agg?.filter((p) => p.status === "failed" || p.status === "abandoned").length ?? 0,
        pending30dCount: agg?.filter((p) => p.status === "pending").length ?? 0,
        gross30dKobo: agg?.filter((p) => p.status === "paid").reduce((s, p) => s + (p.total_charged_kobo ?? 0), 0) ?? 0,
        fees30dKobo: agg?.filter((p) => p.status === "paid").reduce((s, p) => s + (p.paystack_fees_kobo ?? 0), 0) ?? 0,
    };

    return NextResponse.json({
        success: true,
        total: count ?? 0,
        limit,
        offset,
        summary,
        payments: data ?? [],
    });
}
