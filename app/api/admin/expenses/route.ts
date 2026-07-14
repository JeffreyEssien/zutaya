/**
 * Admin expense CRUD (admin-only).
 *   GET    /api/admin/expenses?sinceDays=
 *   POST   /api/admin/expenses   { category, amount, description?, incurredOn?, note? }
 *   PATCH  /api/admin/expenses   { id, ...fields }
 *   DELETE /api/admin/expenses   { id }
 */
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "@/lib/expenses";

export const runtime = "nodejs";

async function guard() {
    const admin = await getCurrentAdmin();
    return !!admin;
}

export async function GET(request: Request) {
    if (!(await guard())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const sinceDays = Number(new URL(request.url).searchParams.get("sinceDays") || 0) || undefined;
    const expenses = await getExpenses(sinceDays);
    return NextResponse.json({ success: true, expenses });
}

export async function POST(request: Request) {
    if (!(await guard())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const b = await request.json();
        const expense = await createExpense({
            category: String(b.category || ""),
            description: b.description ? String(b.description) : undefined,
            amount: Number(b.amount),
            incurredOn: b.incurredOn ? String(b.incurredOn) : undefined,
            note: b.note ? String(b.note) : undefined,
        });
        return NextResponse.json({ success: true, expense });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message || "Could not save" }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    if (!(await guard())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const b = await request.json();
        if (!b.id) throw new Error("Missing id");
        await updateExpense(String(b.id), {
            category: b.category,
            description: b.description,
            amount: b.amount !== undefined ? Number(b.amount) : undefined,
            incurredOn: b.incurredOn,
            note: b.note,
        });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message || "Could not update" }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    if (!(await guard())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const b = await request.json();
    if (!b.id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    await deleteExpense(String(b.id));
    return NextResponse.json({ success: true });
}
