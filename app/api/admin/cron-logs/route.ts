import { NextResponse } from "next/server";
import { getCronLogs } from "@/lib/queries";

export async function GET() {
    const logs = await getCronLogs(100);
    return NextResponse.json({ logs });
}
