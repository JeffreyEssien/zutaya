import { NextResponse, type NextRequest } from "next/server";
import { upsertEventAnimal, deleteEventAnimal } from "@/lib/servicesQueries";
import { getCurrentAdmin } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
    try {
        const admin = await getCurrentAdmin();
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const b = await req.json();
        if (!b.name || b.basePrice == null || !b.feedsAdults) return NextResponse.json({ error: "Name, basePrice, feedsAdults required" }, { status: 400 });
        await upsertEventAnimal({
            id: b.id || undefined, name: b.name, description: b.description, imageUrl: b.imageUrl,
            basePrice: Number(b.basePrice), feedsAdults: Number(b.feedsAdults),
            typicalWeightKg: b.typicalWeightKg ? Number(b.typicalWeightKg) : undefined,
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
    await deleteEventAnimal(id);
    return NextResponse.json({ ok: true });
}
