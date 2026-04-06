import { NextResponse } from "next/server";
import { authenticateAdmin, logAdminAction } from "@/lib/adminAuth";

const attempts = new Map<string, { count: number; reset: number }>();

export async function POST(request: Request) {
    try {
        const ip = request.headers.get("x-forwarded-for") ?? "unknown";
        const now = Date.now();
        const entry = attempts.get(ip);

        if (entry && now < entry.reset && entry.count >= 5) {
            return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
        }
        if (!entry || now >= entry.reset) {
            attempts.set(ip, { count: 1, reset: now + 15 * 60 * 1000 });
        } else {
            entry.count++;
        }

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const result = await authenticateAdmin(email, password);

        if (!result) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Reset rate limit on success
        attempts.delete(ip);

        // Log the login
        await logAdminAction({
            adminId: result.admin.id,
            adminEmail: result.admin.email,
            adminName: result.admin.name,
            action: "login",
            details: `Signed in from ${ip}`,
            ipAddress: ip,
        });

        const response = NextResponse.json({
            success: true,
            admin: { name: result.admin.name, email: result.admin.email, role: result.admin.role },
        });

        response.cookies.set("admin_session", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
