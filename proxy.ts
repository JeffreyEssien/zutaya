import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Simple admin auth middleware.
 * Protects all /admin routes with a password stored in ADMIN_PASSWORD env var.
 * Uses a session cookie to avoid re-prompting on every page load.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect /admin routes
    if (!pathname.startsWith("/admin")) {
        return NextResponse.next();
    }

    // Allow the login page and login API route through
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
        return NextResponse.next();
    }

    // Check for admin session cookie
    const adminToken = request.cookies.get("admin_session")?.value;
    const expectedToken = process.env.ADMIN_SESSION_SECRET || "xelle-admin-default-secret";

    if (adminToken === expectedToken) {
        return NextResponse.next();
    }

    // Redirect to admin login page
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/admin/:path*"],
};
