import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/queries";

export async function POST(request: Request) {
    try {
        const { orderId, email } = await request.json();

        if (!orderId || !email) {
            return NextResponse.json(
                { error: "Order ID and email are required" },
                { status: 400 }
            );
        }

        const order = await getOrderById(orderId);

        // Security: verify email matches (case-insensitive)
        // Return the same error for "not found" and "email mismatch" to prevent info leaking
        if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
            return NextResponse.json(
                { error: "No order found with that ID and email combination" },
                { status: 404 }
            );
        }

        // Return sanitized order (strip admin-only fields)
        const sanitized = {
            id: order.id,
            customerName: order.customerName,
            email: order.email,
            items: order.items.map((item) => ({
                product: {
                    name: item.product.name,
                    price: item.product.price,
                    images: item.product.images,
                    priceUnit: item.product.priceUnit, // needed to show "kg" on the receipt
                },
                variant: item.variant
                    ? { name: item.variant.name, price: item.variant.price }
                    : undefined,
                quantity: item.quantity,
            })),
            subtotal: order.subtotal,
            shipping: order.shipping,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            shippingAddress: order.shippingAddress,
            couponCode: order.couponCode,
            discountTotal: order.discountTotal,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            paystackReference: order.paystackReference,
            processingFee: order.processingFee,
        };

        return NextResponse.json({ success: true, order: sanitized });
    } catch (error) {
        console.error("Order tracking error:", error);
        return NextResponse.json(
            { error: "Failed to look up order" },
            { status: 500 }
        );
    }
}
