import { NextResponse, type NextRequest } from "next/server";
import { upsertProcessingOption, deleteProcessingOption } from "@/lib/servicesQueries";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.label) return NextResponse.json({ error: "Label required" }, { status: 400 });
        await upsertProcessingOption({
            id: body.id || undefined,
            label: body.label,
            description: body.description,
            icon: body.icon,
            extraFee: Number(body.extraFee || 0),
            extendsShelfLife: !!body.extendsShelfLife,
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
    await deleteProcessingOption(id);
    return NextResponse.json({ ok: true });
}
