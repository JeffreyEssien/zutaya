import {
    getZutayaPackages,
    createZutayaPackage,
    updateZutayaPackage,
    deleteZutayaPackage,
} from "@/lib/queries";
import { getCurrentAdmin } from "@/lib/adminAuth";

async function isAdmin(): Promise<boolean> {
    return (await getCurrentAdmin()) !== null;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    // Public storefront passes ?active=1; admin omits it to see everything.
    const activeOnly = searchParams.get("active") === "1";
    const packages = await getZutayaPackages(activeOnly);
    return Response.json(packages);
}

export async function POST(req: Request) {
    if (!(await isAdmin())) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, price, items } = body;

    if (!name || price == null) {
        return Response.json({ error: "Name and price are required" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
        return Response.json({ error: "A package needs at least one content line" }, { status: 400 });
    }

    const id = await createZutayaPackage({
        name,
        description: body.description,
        tagline: body.tagline,
        price: Number(price),
        imageUrl: body.imageUrl,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        items,
    });

    return Response.json({ id });
}

export async function PUT(req: Request) {
    if (!(await isAdmin())) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
    }
    if (updates.price != null) updates.price = Number(updates.price);

    await updateZutayaPackage(id, updates);
    return Response.json({ success: true });
}

export async function DELETE(req: Request) {
    if (!(await isAdmin())) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
    }

    await deleteZutayaPackage(id);
    return Response.json({ success: true });
}
