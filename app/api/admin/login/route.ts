import { NextResponse } from "next/server";
import { authenticateAdmin, logAdminAction } from "@/lib/adminAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Brute-force throttle. Backed by the `rate_limits` table (Supabase) so it
// survives Vercel cold starts — the previous in-memory Map reset on every cold
// start and was effectively no protection. 8 attempts per IP per 15 minutes
// leaves room for an admin who fat-fingers their password a few times while
// still stopping credential-stuffing. Fails OPEN if the DB is unreachable.
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_SECONDS = 15 * 60;

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const limit = await checkRateLimit({
            key: `login:ip:${ip}`,
            limit: LOGIN_MAX_ATTEMPTS,
            windowSeconds: LOGIN_WINDOW_SECONDS,
        });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Try again in 15 minutes." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
            );
        }

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const result = await authenticateAdmin(email, password);

        if (!result) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

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
