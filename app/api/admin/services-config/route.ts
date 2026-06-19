import { NextResponse, type NextRequest } from "next/server";
import { updateSiteSettings } from "@/lib/queries";
import { getCurrentAdmin } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
    try {
        const admin = await getCurrentAdmin();
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const b = await req.json();
        await updateSiteSettings({
            deliveryCutoffHour: Number(b.deliveryCutoffHour),
            deliveryCutoffLabel: b.deliveryCutoffLabel,
            eventsEnabled: !!b.eventsEnabled,
            eventsTagline: b.eventsTagline,
            butcherProfiles: Array.isArray(b.butcherProfiles) ? b.butcherProfiles : [],
        });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message }, { status: 500 });
    }
}
