import { createSubscription, getSubscriptions, updateSubscription } from "@/lib/queries";
import { getCurrentAdmin } from "@/lib/adminAuth";

// The cookie holds a random session TOKEN validated against admin_sessions —
// NOT ADMIN_SESSION_SECRET. The old `session === secret` check could never pass
// for a real admin. getCurrentAdmin() is the canonical scheme (same as the
// orders route). See also app/api/bundles/route.ts.
async function isAdmin(): Promise<boolean> {
    return (await getCurrentAdmin()) !== null;
}

export async function GET() {
    if (!await isAdmin()) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const subs = await getSubscriptions();
    return Response.json(subs);
}

export async function POST(req: Request) {
    const body = await req.json();
    const { customerEmail, customerName, phone, items, frequency, deliveryAddress, deliveryZone, paymentMethod } = body;

    if (!customerEmail || !customerName || !items?.length || !frequency) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate next order date based on frequency
    const now = new Date();
    let nextDate: Date;
    switch (frequency) {
        case "weekly":
            nextDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case "biweekly":
            nextDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            break;
        case "monthly":
            nextDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            break;
        default:
            return Response.json({ error: "Invalid frequency" }, { status: 400 });
    }

    const id = await createSubscription({
        customerEmail,
        customerName,
        phone,
        items,
        frequency,
        deliveryAddress,
        deliveryZone,
        paymentMethod,
        nextOrderDate: nextDate.toISOString().slice(0, 10),
    });

    return Response.json({ id, success: true });
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

    await updateSubscription(id, updates);
    return Response.json({ success: true });
}
