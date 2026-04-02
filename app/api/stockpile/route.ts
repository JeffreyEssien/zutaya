import { NextResponse } from "next/server";
import {
    getStockpileByEmail,
    getStockpileById,
    createStockpile,
    addStockpileItem,
    removeStockpileItem,
    updateStockpileStatus,
    updateStockpileShipping,
    getAllStockpiles,
    expireOldStockpiles,
} from "@/lib/queries";
import { getSupabaseClient } from "@/lib/supabase";
import {
    sendStockpileCreatedEmail,
    sendStockpileItemAddedEmail,
    sendStockpileShippedEmail,
    sendStockpileExpiredEmail,
} from "@/lib/email";

// GET: Fetch stockpile by email or ID, or all (admin)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");
        const id = searchParams.get("id");
        const all = searchParams.get("all");

        // Expire old stockpiles on every fetch & send expiry emails
        const expiredCount = await expireOldStockpiles();
        if (expiredCount > 0) {
            // Fetch recently expired stockpiles to send emails
            try {
                const allStockpiles = await getAllStockpiles();
                const recentlyExpired = allStockpiles.filter(
                    (s) => s.status === "expired" &&
                        new Date(s.expiresAt).getTime() > Date.now() - 1000 * 60 * 60 // expired in last hour
                );
                for (const s of recentlyExpired) {
                    sendStockpileExpiredEmail(s).catch(() => { }); // fire-and-forget
                }
            } catch { }
        }

        if (all === "true") {
            const stockpiles = await getAllStockpiles();
            return NextResponse.json(stockpiles);
        }

        if (id) {
            const stockpile = await getStockpileById(id);
            return NextResponse.json(stockpile);
        }

        if (email) {
            const stockpile = await getStockpileByEmail(email);
            return NextResponse.json(stockpile);
        }

        return NextResponse.json({ error: "Provide email, id, or all=true" }, { status: 400 });
    } catch (error) {
        console.error("Stockpile GET error:", error);
        return NextResponse.json({ error: "Failed to fetch stockpile" }, { status: 500 });
    }
}

// POST: Create stockpile, add item, remove item, update status, update shipping
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case "create": {
                const stockpile = await createStockpile({
                    customerEmail: body.customerEmail,
                    customerName: body.customerName,
                    phone: body.phone,
                });
                // Send welcome email
                sendStockpileCreatedEmail(stockpile).catch(() => { });
                return NextResponse.json(stockpile);
            }
            case "add_item": {
                const supabase = getSupabaseClient();
                if (!supabase) throw new Error("Database not available");

                // Deduct stock when adding to stockpile (same as order placement)
                if (body.variantName) {
                    const { error: rpcError } = await supabase.rpc("deduct_variant_stock", {
                        p_product_id: body.productId,
                        p_variant_name: body.variantName,
                        p_quantity: body.quantity,
                    });
                    if (rpcError) {
                        throw new Error(rpcError.message || `Insufficient stock for ${body.productName} - ${body.variantName}`);
                    }
                } else {
                    // Try to deduct from main inventory if product has inventoryId
                    if (body.inventoryId) {
                        const { error: rpcError } = await supabase.rpc("deduct_stock", {
                            p_inventory_id: body.inventoryId,
                            p_quantity: body.quantity,
                        });
                        if (rpcError) {
                            throw new Error(rpcError.message || `Insufficient stock for ${body.productName}`);
                        }
                    }
                }

                await addStockpileItem({
                    stockpileId: body.stockpileId,
                    productId: body.productId,
                    productName: body.productName,
                    productImage: body.productImage,
                    variantName: body.variantName,
                    quantity: body.quantity,
                    pricePaid: body.pricePaid,
                    orderId: body.orderId,
                });
                // Send item added email (fetch updated stockpile for full item list)
                const updatedStockpile = await getStockpileById(body.stockpileId);
                if (updatedStockpile) {
                    const newItem = {
                        id: "", stockpileId: body.stockpileId,
                        productId: body.productId, productName: body.productName,
                        productImage: body.productImage, variantName: body.variantName,
                        quantity: body.quantity, pricePaid: body.pricePaid,
                        createdAt: new Date().toISOString(),
                    };
                    sendStockpileItemAddedEmail(updatedStockpile, [newItem]).catch(() => { });
                }
                return NextResponse.json({ success: true });
            }
            case "remove_item": {
                // Restore stock when removing from stockpile
                const supabaseForRemove = getSupabaseClient();
                if (supabaseForRemove && body.productId && body.quantity) {
                    try {
                        if (body.variantName) {
                            // Restore variant stock: fetch current, then add back
                            const { data: prod } = await supabaseForRemove
                                .from("products")
                                .select("variants")
                                .eq("id", body.productId)
                                .single();
                            if (prod?.variants) {
                                const variants = prod.variants as any[];
                                const idx = variants.findIndex((v: any) => v.name === body.variantName);
                                if (idx >= 0) {
                                    variants[idx].stock = (variants[idx].stock || 0) + body.quantity;
                                    const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
                                    await supabaseForRemove
                                        .from("products")
                                        .update({ variants, stock: totalStock })
                                        .eq("id", body.productId);
                                }
                            }
                        } else if (body.inventoryId) {
                            // Restore main inventory stock
                            const { data: inv } = await supabaseForRemove
                                .from("inventory_items")
                                .select("stock")
                                .eq("id", body.inventoryId)
                                .single();
                            if (inv) {
                                await supabaseForRemove
                                    .from("inventory_items")
                                    .update({ stock: inv.stock + body.quantity })
                                    .eq("id", body.inventoryId);
                            }
                        }
                    } catch (e) {
                        console.warn("Stock restore on stockpile remove failed:", e);
                    }
                }
                await removeStockpileItem(body.itemId, body.stockpileId);
                return NextResponse.json({ success: true });
            }
            case "update_status": {
                await updateStockpileStatus(body.stockpileId, body.status);
                // Send email based on new status
                const stockpile = await getStockpileById(body.stockpileId);
                if (stockpile) {
                    if (body.status === "shipped") {
                        sendStockpileShippedEmail(stockpile).catch(() => { });
                    } else if (body.status === "expired" || body.status === "cancelled") {
                        sendStockpileExpiredEmail(stockpile).catch(() => { });
                    }
                }
                return NextResponse.json({ success: true });
            }
            case "update_shipping": {
                await updateStockpileShipping(body.stockpileId, {
                    shippingAddress: body.shippingAddress,
                    deliveryZone: body.deliveryZone,
                    deliveryType: body.deliveryType,
                    deliveryFee: body.deliveryFee,
                });
                return NextResponse.json({ success: true });
            }
            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }
    } catch (error) {
        console.error("Stockpile POST error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed" },
            { status: 500 }
        );
    }
}
