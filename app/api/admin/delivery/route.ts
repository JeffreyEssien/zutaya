import { NextRequest, NextResponse } from "next/server";
import {
    getDeliveryZones,
    createDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
    createDeliveryLocation, updateDeliveryLocation, deleteDeliveryLocation,
} from "@/lib/queries";
import { getCurrentAdmin } from "@/lib/adminAuth";

// GET is intentionally PUBLIC: the customer checkout (lib/deliveryPricing.ts →
// fetchDeliveryPricingFromDB) reads zone fees here. It returns only delivery
// pricing (no PII). Mutations below are admin-gated.
export async function GET() {
    try {
        const zones = await getDeliveryZones();
        return NextResponse.json({ success: true, zones });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const admin = await getCurrentAdmin();
        if (!admin) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { action } = body;

        switch (action) {
            case "create_zone": {
                const id = await createDeliveryZone(body.zone);
                return NextResponse.json({ success: true, id });
            }
            case "update_zone": {
                await updateDeliveryZone(body.id, body.updates);
                return NextResponse.json({ success: true });
            }
            case "delete_zone": {
                await deleteDeliveryZone(body.id);
                return NextResponse.json({ success: true });
            }
            case "create_location": {
                const id = await createDeliveryLocation(body.location);
                return NextResponse.json({ success: true, id });
            }
            case "update_location": {
                await updateDeliveryLocation(body.id, body.updates);
                return NextResponse.json({ success: true });
            }
            case "delete_location": {
                await deleteDeliveryLocation(body.id);
                return NextResponse.json({ success: true });
            }
            default:
                return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
