import { notFound } from "next/navigation";
import { getOrders } from "@/lib/queries";
import { formatCurrency } from "@/lib/formatCurrency";
import { SITE_NAME } from "@/lib/constants";
import Image from "next/image";

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const orders = await getOrders();
    const order = orders.find((o) => o.id === id);

    if (!order) notFound();

    return (
        <div className="max-w-3xl mx-auto p-8 bg-white print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-black/10 pb-8 mb-8">
                <div>
                    <h1 className="font-serif text-3xl text-brand-dark mb-2">{SITE_NAME}</h1>
                    <p className="text-sm text-brand-dark/60">Thank you for your business.</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-medium text-brand-dark uppercase tracking-wide">Packing Slip</h2>
                    <p className="text-sm text-brand-dark/60 mt-1">Order #{order.id}</p>
                    <p className="text-sm text-brand-dark/60">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-xs font-semibold text-brand-dark/40 uppercase tracking-wider mb-3">Ship To</h3>
                    <div className="text-sm text-brand-dark space-y-1">
                        <p className="font-medium">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                        <p>{order.shippingAddress.address}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                        <p>{order.shippingAddress.country}</p>
                        <p className="text-brand-dark/60 mt-2">{order.email}</p>
                        <p className="text-brand-dark/60">{order.phone}</p>
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-semibold text-brand-dark/40 uppercase tracking-wider mb-3">Order Details</h3>
                    <div className="text-sm text-brand-dark space-y-1">
                        <p>Status: <span className="uppercase">{order.status}</span></p>
                        <p>Payment: {order.paymentMethod === "bank_transfer" ? "Bank Transfer" : order.paymentMethod === "whatsapp" ? "WhatsApp" : "—"}</p>
                        {order.deliveryZone && <p>Delivery Zone: {order.deliveryZone}</p>}
                        <p>Delivery Type: {order.deliveryType === "hub_pickup" ? "Hub Pickup" : "Doorstep Delivery"}</p>
                    </div>
                </div>
            </div>

            {/* Items */}
            <table className="w-full text-sm mb-12">
                <thead>
                    <tr className="border-b border-black">
                        <th className="text-left font-medium py-2 w-16">Qty</th>
                        <th className="text-left font-medium py-2">Item</th>
                        <th className="text-right font-medium py-2">Price</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                    {order.items.map((item) => (
                        <tr key={`${item.product.id}-${item.variant?.name ?? ""}`}>
                            <td className="py-4 text-brand-dark align-top">{item.quantity}</td>
                            <td className="py-4 text-brand-dark align-top">
                                <p className="font-medium">{item.product.name}</p>
                                {item.variant && (
                                    <p className="text-brand-dark/60 text-xs mt-1">Variant: {item.variant.name}</p>
                                )}
                            </td>
                            <td className="py-4 text-right text-brand-dark align-top">
                                {formatCurrency((item.variant?.price || item.product.price) * item.quantity)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-black/10 pt-4 mb-12">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-brand-dark/60">Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountTotal ? (
                    <div className="flex justify-between text-sm mb-1 text-green-600">
                        <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                        <span>-{formatCurrency(order.discountTotal)}</span>
                    </div>
                ) : null}
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-brand-dark/60">Delivery</span>
                    <span>{order.shipping === 0 ? 'Free' : formatCurrency(order.shipping)}</span>
                </div>
                <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-black/10">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-brand-purple pt-8 text-center">
                <p className="text-brand-dark font-serif text-lg mb-2">Thank you!</p>
                <p className="text-sm text-brand-dark/50">
                    If you have any questions about this order, reach out to us on WhatsApp.
                </p>
            </div>

            {/* Print Trigger */}
            <div className="mt-12 text-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-brand-dark text-white px-6 py-2 rounded-sm hover:bg-black transition-colors"
                >
                    Print Packing Slip
                </button>
            </div>
        </div>
    );
}
