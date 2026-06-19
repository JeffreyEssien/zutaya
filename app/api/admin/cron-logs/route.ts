import { NextResponse } from "next/server";
import { getCronLogs } from "@/lib/queries";
import { getCurrentAdmin } from "@/lib/adminAuth";

export async function GET() {
    const admin = await getCurrentAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const logs = await getCronLogs(100);
    return NextResponse.json({ logs });
}
