import { NextResponse } from "next/server";

const attempts = new Map<string, { count: number; reset: number }>();

export async function POST(request: Request) {
    try {
        const ip = request.headers.get("x-forwarded-for") ?? "unknown";
        const now = Date.now();
        const entry = attempts.get(ip);

        if (entry && now < entry.reset && entry.count >= 5) {
            return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
        }
        if (!entry || now >= entry.reset) {
            attempts.set(ip, { count: 1, reset: now + 15 * 60 * 1000 });
        } else {
            entry.count++;
        }

        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD;
        const sessionSecret = process.env.ADMIN_SESSION_SECRET;

        if (!adminPassword || !sessionSecret) {
            console.error("ADMIN_PASSWORD or ADMIN_SESSION_SECRET not set");
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        if (password !== adminPassword) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });
        response.cookies.set("admin_session", sessionSecret, {
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
