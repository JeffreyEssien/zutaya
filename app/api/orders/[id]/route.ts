import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateOrderStatus, updatePaymentInfo, getOrderById } from "@/lib/queries";
import { sendOrderDeliveredEmail, sendPaymentApprovedEmail, sendReviewRequestEmail } from "@/lib/email";
import { getCurrentAdmin, logAdminAction } from "@/lib/adminAuth";
import type { Order } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";

/**
 * Validate that a status transition follows the sequential pipeline.
 * Allowed transitions: each status can only move to the next one in the pipeline.
 * Exception: any status can go back to "pending" (admin override / revert).
 */
function isValidStatusTransition(current: Order["status"], next: Order["status"]): boolean {
    if (current === next) return true;
    const currentIdx = ORDER_STATUSES.indexOf(current);
    const nextIdx = ORDER_STATUSES.indexOf(next);
    if (currentIdx === -1 || nextIdx === -1) return false;
    // Allow moving forward by exactly one step
    if (nextIdx === currentIdx + 1) return true;
    // Allow reverting to previous step (admin correction)
    if (nextIdx === currentIdx - 1) return true;
    return false;
}

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

        if (!ORDER_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status: ${status}` },
                { status: 400 }
            );
        }

        // Fetch current order to validate transition
        const order = await getOrderById(id);
        if (!order) {
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 }
            );
        }

        if (!isValidStatusTransition(order.status, status)) {
            const currentIdx = ORDER_STATUSES.indexOf(order.status);
            const allowedNext = ORDER_STATUSES[currentIdx + 1];
            const allowedPrev = currentIdx > 0 ? ORDER_STATUSES[currentIdx - 1] : null;
            const allowed = [allowedPrev, allowedNext].filter(Boolean).join(" or ");
            return NextResponse.json(
                {
                    error: `Cannot skip stages. Current: "${order.status}". Next allowed: ${allowed}.`,
                },
                { status: 400 }
            );
        }

        await updateOrderStatus(id, status as Order["status"]);

        // Audit log
        const admin = await getCurrentAdmin();
        if (admin) {
            await logAdminAction({
                adminId: admin.id,
                adminEmail: admin.email,
                adminName: admin.name,
                action: "status_change",
                entityType: "order",
                entityId: id,
                details: `Changed order status from "${order.status}" to "${status}"`,
            });
        }

        revalidatePath("/admin");
        revalidatePath("/admin/orders");

        // Send status email to customer
        if (status === "delivered") {
            await sendOrderDeliveredEmail(order);
            await sendReviewRequestEmail(order);
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

        // Audit log
        const admin = await getCurrentAdmin();
        if (admin) {
            await logAdminAction({
                adminId: admin.id,
                adminEmail: admin.email,
                adminName: admin.name,
                action: "payment_update",
                entityType: "order",
                entityId: id,
                details: `Payment ${paymentStatus || "updated"}${senderName ? ` — sender: ${senderName}` : ""}`,
            });
        }

        revalidatePath("/admin");
        revalidatePath("/admin/orders");

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
