import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, validateSession, logAdminAction } from "@/lib/adminAuth";

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_session")?.value;

        if (token) {
            const admin = await validateSession(token);
            if (admin) {
                const ip = request.headers.get("x-forwarded-for") ?? "unknown";
                await logAdminAction({
                    adminId: admin.id,
                    adminEmail: admin.email,
                    adminName: admin.name,
                    action: "logout",
                    details: `Signed out from ${ip}`,
                    ipAddress: ip,
                });
            }
            await destroySession(token);
        }

        const response = NextResponse.json({ success: true });
        response.cookies.set("admin_session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return response;
    } catch {
        return NextResponse.json({ error: "Logout failed" }, { status: 500 });
    }
}
