import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
        return NextResponse.json({ error: "date parameter required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
        // Fallback: all slots available
        return NextResponse.json({ morning: true, afternoon: true, evening: true });
    }

    const { data, error } = await supabase
        .from("delivery_capacity")
        .select("slot, max_orders, booked_count")
        .eq("delivery_date", date);

    if (error) {
        console.error("Delivery availability error:", error.message);
        return NextResponse.json({ morning: true, afternoon: true, evening: true });
    }

    const slots: Record<string, boolean> = { morning: true, afternoon: true, evening: true };

    for (const row of data || []) {
        slots[row.slot] = row.booked_count < row.max_orders;
    }

    return NextResponse.json(slots);
}
