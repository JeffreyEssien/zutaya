import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin auth proxy — protects /admin routes.
 * Validates session token against admin_sessions table in Supabase.
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect /admin routes
    if (!pathname.startsWith("/admin")) {
        return NextResponse.next();
    }

    // Allow login page and auth API routes through
    if (
        pathname === "/admin/login" ||
        pathname.startsWith("/api/admin/login") ||
        pathname.startsWith("/api/admin/logout")
    ) {
        return NextResponse.next();
    }

    // Check session cookie
    const token = request.cookies.get("admin_session")?.value;
    if (!token) {
        return redirectToLogin(request, pathname);
    }

    // Validate token against DB
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        // Fallback: allow if env not set (dev)
        return NextResponse.next();
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
        .from("admin_sessions")
        .select("id, admin_id, expires_at")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (error || !data) {
        const response = redirectToLogin(request, pathname);
        response.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
        return response;
    }

    return NextResponse.next();
}

function redirectToLogin(request: NextRequest, from: string) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", from);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/admin/:path*"],
};
