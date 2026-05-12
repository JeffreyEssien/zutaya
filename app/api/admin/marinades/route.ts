import { NextResponse, type NextRequest } from "next/server";
import { upsertMarinade, deleteMarinade } from "@/lib/servicesQueries";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
        await upsertMarinade({
            id: body.id || undefined,
            name: body.name,
            description: body.description,
            imageUrl: body.imageUrl,
            extraFee: Number(body.extraFee || 0),
            cureHours: Number(body.cureHours || 0),
            isActive: !!body.isActive,
            sortOrder: Number(body.sortOrder || 0),
        });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Save failed" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteMarinade(id);
    return NextResponse.json({ ok: true });
}
