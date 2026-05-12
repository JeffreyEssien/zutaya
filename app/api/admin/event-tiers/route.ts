import { NextResponse, type NextRequest } from "next/server";
import { upsertEventServiceTier, deleteEventServiceTier } from "@/lib/servicesQueries";

export async function POST(req: NextRequest) {
    try {
        const b = await req.json();
        if (!b.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
        await upsertEventServiceTier({
            id: b.id || undefined, name: b.name, description: b.description,
            priceModifier: Number(b.priceModifier || 0), pricePerHead: Number(b.pricePerHead || 0),
            includes: Array.isArray(b.includes) ? b.includes : (typeof b.includes === "string" ? b.includes.split("\n").map((s: string) => s.trim()).filter(Boolean) : []),
            isActive: !!b.isActive, sortOrder: Number(b.sortOrder || 0),
        });
        return NextResponse.json({ ok: true });
    } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteEventServiceTier(id);
    return NextResponse.json({ ok: true });
}
