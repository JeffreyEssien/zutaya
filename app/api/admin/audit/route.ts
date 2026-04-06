import { NextResponse } from "next/server";
import { getCurrentAdmin, logAdminAction } from "@/lib/adminAuth";

/** Client-side audit logging endpoint */
export async function POST(request: Request) {
    try {
        const admin = await getCurrentAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { action, entityType, entityId, details } = await request.json();
        const ip = request.headers.get("x-forwarded-for") ?? "unknown";

        await logAdminAction({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.name,
            action,
            entityType,
            entityId,
            details,
            ipAddress: ip,
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to log" }, { status: 500 });
    }
}

export async function GET() {
    const { getAuditLogs } = await import("@/lib/adminAuth");
    const logs = await getAuditLogs(200);
    return NextResponse.json({ logs });
}
