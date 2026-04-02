import { NextRequest, NextResponse } from "next/server";
import { unsubscribeNewsletter } from "@/lib/queries";

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const success = await unsubscribeNewsletter(token);

    if (success) {
        // Redirect to the unsubscribe confirmation page
        return NextResponse.redirect(new URL("/newsletter/unsubscribe?success=true", req.url));
    }

    return NextResponse.redirect(new URL("/newsletter/unsubscribe?success=false", req.url));
}
