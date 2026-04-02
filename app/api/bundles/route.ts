import { getBundleRules, createBundleRule, updateBundleRule, deleteBundleRule } from "@/lib/queries";
import { cookies } from "next/headers";

async function isAdmin(): Promise<boolean> {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return false;
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session")?.value;
    return session === secret;
}

export async function GET() {
    const bundles = await getBundleRules(true);
    return Response.json(bundles);
}

export async function POST(req: Request) {
    if (!await isAdmin()) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, minItems, maxItems, discountPercent, allowedCategoryIds, isActive } = body;

    if (!name || minItems == null || maxItems == null || discountPercent == null) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = await createBundleRule({
        name,
        description,
        minItems,
        maxItems,
        discountPercent,
        allowedCategoryIds,
        isActive,
    });

    return Response.json({ id });
}

export async function PUT(req: Request) {
    if (!await isAdmin()) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
    }

    await updateBundleRule(id, updates);
    return Response.json({ success: true });
}

export async function DELETE(req: Request) {
    if (!await isAdmin()) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
    }

    await deleteBundleRule(id);
    return Response.json({ success: true });
}
