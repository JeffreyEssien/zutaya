import { NextResponse, type NextRequest } from "next/server";
import { upsertEventOccasion, deleteEventOccasion } from "@/lib/servicesQueries";
import { getCurrentAdmin } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
    try {
        const admin = await getCurrentAdmin();
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const b = await req.json();
        if (!b.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
        await upsertEventOccasion({
            id: b.id || undefined, name: b.name, description: b.description, icon: b.icon,
            typicalHeadcountMin: b.typicalHeadcountMin ? Number(b.typicalHeadcountMin) : undefined,
            typicalHeadcountMax: b.typicalHeadcountMax ? Number(b.typicalHeadcountMax) : undefined,
            isActive: !!b.isActive, sortOrder: Number(b.sortOrder || 0),
        });
        return NextResponse.json({ ok: true });
    } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteEventOccasion(id);
    return NextResponse.json({ ok: true });
}
