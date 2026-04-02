import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateOrderStatus, updatePaymentInfo, getOrderById } from "@/lib/queries";
import { sendOrderDeliveredEmail, sendPaymentApprovedEmail, sendReviewRequestEmail } from "@/lib/email";
import type { Order } from "@/types";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json(
                { error: "Status is required" },
                { status: 400 }
            );
        }

        await updateOrderStatus(id, status as Order["status"]);

        // Revalidate admin pages to reflect changes immediately
        revalidatePath("/admin");
        revalidatePath("/admin/orders");

        // Send status email to customer
        const order = await getOrderById(id);
        if (order) {
            if (status === "delivered") {
                await sendOrderDeliveredEmail(order);
                await sendReviewRequestEmail(order);
            }
            // TODO: Add sendOrderPackedEmail and sendOutForDeliveryEmail when implemented
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating order status:", error);
        return NextResponse.json(
            { error: "Failed to update order status" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { senderName, paymentStatus } = body;

        await updatePaymentInfo(id, {
            senderName: senderName || undefined,
            paymentStatus: paymentStatus || undefined,
        });

        revalidatePath("/admin");
        revalidatePath("/admin/orders");

        // Send payment approved email if admin confirmed payment
        if (paymentStatus === "payment_confirmed") {
            const order = await getOrderById(id);
            if (order) {
                await sendPaymentApprovedEmail(order);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating payment info:", error);
        return NextResponse.json(
            { error: "Failed to update payment info" },
            { status: 500 }
        );
    }
}
