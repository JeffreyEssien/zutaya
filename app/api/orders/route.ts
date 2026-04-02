import { NextResponse } from "next/server";
import type { Order } from "@/types";
import { createOrder } from "@/lib/queries";
import { sendOrderEmails } from "@/lib/email";
import { SITE_EMAIL } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const order: Order = await request.json();

    // Insert into Supabase
    await createOrder(order);

    // Send emails (customer receipt + admin notification)
    // Falls back to console logging if SMTP is not configured
    await sendOrderEmails(order);

    // Always log to console as backup
    console.log(`\n🛍️ ORDER PLACED: ${order.id}`);
    console.log(`   Customer: ${order.customerName} (${order.email})`);
    console.log(`   Total: ₦${order.total.toLocaleString()}`);
    console.log(`   Payment: ${order.paymentMethod || "not specified"}`);

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error("Order error:", message, err);
    return NextResponse.json(
      { success: false, error: message || "Failed to process order" },
      { status: 500 }
    );
  }
}
