"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import Button from "@/components/ui/Button";
import { Plus, Trash2, ShoppingBag, X, Package, User, MapPin, CreditCard, Truck, FileText } from "lucide-react";
import { logAction } from "@/lib/auditClient";

interface OrderItem {
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
}

interface AdminCreateOrderProps {
    onClose: () => void;
    onSuccess: () => void;
}

function generateOrderId(): string {
    // Generate a short readable order ID like: XL-20260314-A7K3
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return `XL-${dateStr}-${suffix}`;
}

export default function AdminCreateOrder({ onClose, onSuccess }: AdminCreateOrderProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Customer
    const [customerName, setCustomerName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Shipping Address
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");

    // Items
    const [items, setItems] = useState<OrderItem[]>([
        { productName: "", variantName: "", quantity: 1, unitPrice: 0 },
    ]);

    // Financials
    const [shippingFee, setShippingFee] = useState(0);
    const [couponCode, setCouponCode] = useState("");
    const [discountTotal, setDiscountTotal] = useState(0);

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<"whatsapp" | "bank_transfer">("bank_transfer");
    const [paymentStatus, setPaymentStatus] = useState<"awaiting_payment" | "payment_submitted" | "payment_confirmed">("payment_confirmed");
    const [status, setStatus] = useState<"pending" | "shipped" | "delivered">("pending");

    // Delivery
    const [deliveryZone, setDeliveryZone] = useState("");
    const [deliveryType, setDeliveryType] = useState<"doorstep" | "hub_pickup">("doorstep");

    // Notes
    const [notes, setNotes] = useState("");

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = Math.max(0, subtotal - discountTotal + shippingFee);

    function addItem() {
        setItems([...items, { productName: "", variantName: "", quantity: 1, unitPrice: 0 }]);
    }

    function removeItem(index: number) {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: keyof OrderItem, value: string | number) {
        setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        // Validate
        if (!customerName.trim() || !email.trim()) {
            setError("Customer name and email are required.");
            return;
        }
        if (items.some((i) => !i.productName.trim() || i.unitPrice <= 0 || i.quantity <= 0)) {
            setError("All items must have a name, valid price, and quantity.");
            return;
        }

        setLoading(true);

        const orderId = generateOrderId();

        const orderPayload = {
            id: orderId,
            customerName: customerName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            items: items.map((item) => ({
                product: {
                    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    slug: item.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    name: item.productName.trim(),
                    description: "",
                    price: item.unitPrice,
                    category: "",
                    brand: "Zúta Ya",
                    stock: 999,
                    images: [],
                    variants: [],
                    isFeatured: false,
                    isNew: false,
                },
                variant: item.variantName ? { name: item.variantName, price: item.unitPrice } : undefined,
                quantity: item.quantity,
            })),
            subtotal,
            shipping: shippingFee,
            total,
            status,
            shippingAddress: {
                firstName: firstName.trim() || customerName.split(" ")[0],
                lastName: lastName.trim() || customerName.split(" ").slice(1).join(" "),
                email: email.trim(),
                phone: phone.trim(),
                address: address.trim(),
                city: city.trim(),
                state: state.trim(),
                zip: zip.trim(),
                country: "Nigeria",
            },
            notes: notes.trim() || undefined,
            couponCode: couponCode.trim() || undefined,
            discountTotal: discountTotal || undefined,
            paymentMethod,
            paymentStatus,
            createdAt: new Date().toISOString(),
            deliveryZone: deliveryZone.trim() || undefined,
            deliveryType: deliveryType || undefined,
        };

        try {
            const res = await fetch("/api/admin/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderPayload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create order");
            }

            logAction("create", "order", data.id, `Admin-created order for ${customerName}`);
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "w-full px-3 py-2.5 border border-warm-cream/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/30 bg-white/[0.04] transition-all";
    const labelClass = "block text-xs font-medium text-warm-cream/60 mb-1.5";
    const sectionClass = "bg-white/[0.04] rounded-xl border border-warm-cream/10 p-5";

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 backdrop-blur-sm p-4 sm:p-8">
            <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-3xl my-4 border border-warm-cream/10 overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/[0.04] border-b border-warm-cream/10 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-green/10 rounded-lg">
                            <ShoppingBag size={18} className="text-brand-green" />
                        </div>
                        <div>
                            <h2 className="font-serif text-lg text-warm-cream">Create Order</h2>
                            <p className="text-xs text-warm-cream/40">Manually create a new order</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} className="text-warm-cream/40" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* ── Customer Info ── */}
                    <div className={sectionClass}>
                        <h3 className="text-sm font-semibold text-warm-cream flex items-center gap-2 mb-4">
                            <User size={14} className="text-brand-green" /> Customer Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Full Name *</label>
                                <input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Amaka Johnson" required />
                            </div>
                            <div>
                                <label className={labelClass}>Email *</label>
                                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" required />
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
                            </div>
                        </div>
                    </div>

                    {/* ── Shipping Address ── */}
                    <div className={sectionClass}>
                        <h3 className="text-sm font-semibold text-warm-cream flex items-center gap-2 mb-4">
                            <MapPin size={14} className="text-brand-green" /> Shipping Address
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>First Name</label>
                                <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                            </div>
                            <div>
                                <label className={labelClass}>Last Name</label>
                                <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Street Address</label>
                                <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Example Street" />
                            </div>
                            <div>
                                <label className={labelClass}>City</label>
                                <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos" />
                            </div>
                            <div>
                                <label className={labelClass}>State</label>
                                <input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} placeholder="Lagos" />
                            </div>
                            <div>
                                <label className={labelClass}>ZIP / Postal Code</label>
                                <input className={inputClass} value={zip} onChange={(e) => setZip(e.target.value)} placeholder="100001" />
                            </div>
                        </div>
                    </div>

                    {/* ── Items ── */}
                    <div className={sectionClass}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-warm-cream flex items-center gap-2">
                                <Package size={14} className="text-brand-green" /> Order Items
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs text-brand-green hover:text-warm-cream font-medium transition-colors cursor-pointer"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="bg-[#111] rounded-lg p-4 border border-warm-cream/10">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <span className="text-xs font-medium text-warm-cream/40">Item {idx + 1}</span>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>Product Name *</label>
                                            <input
                                                className={inputClass}
                                                value={item.productName}
                                                onChange={(e) => updateItem(idx, "productName", e.target.value)}
                                                placeholder="Product name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Variant</label>
                                            <input
                                                className={inputClass}
                                                value={item.variantName}
                                                onChange={(e) => updateItem(idx, "variantName", e.target.value)}
                                                placeholder="e.g. Size M"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className={labelClass}>Qty *</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className={inputClass}
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                                                    required
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className={labelClass}>Price (₦) *</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className={inputClass}
                                                    value={item.unitPrice || ""}
                                                    onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-warm-cream/30 mt-2 text-right">
                                        Line total: {formatCurrency(item.unitPrice * item.quantity)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Financials ── */}
                    <div className={sectionClass}>
                        <h3 className="text-sm font-semibold text-warm-cream flex items-center gap-2 mb-4">
                            <CreditCard size={14} className="text-brand-green" /> Financials & Payment
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className={labelClass}>Coupon Code</label>
                                <input className={inputClass} value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="SAVE10" />
                            </div>
                            <div>
                                <label className={labelClass}>Discount Amount (₦)</label>
                                <input type="number" min="0" step="0.01" className={inputClass} value={discountTotal || ""} onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)} placeholder="0" />
                            </div>
                            <div>
                                <label className={labelClass}>Shipping Fee (₦)</label>
                                <input type="number" min="0" step="0.01" className={inputClass} value={shippingFee || ""} onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)} placeholder="0" />
                            </div>
                        </div>

                        {/* Totals summary */}
                        <div className="bg-[#111] rounded-lg p-4 border border-warm-cream/10 mb-4">
                            <div className="flex justify-between text-sm text-warm-cream/60 mb-1">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {discountTotal > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600 mb-1">
                                    <span>Discount{couponCode ? ` (${couponCode})` : ""}</span>
                                    <span>-{formatCurrency(discountTotal)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-warm-cream/60 mb-2">
                                <span>Shipping</span>
                                <span>{shippingFee === 0 ? "Free" : formatCurrency(shippingFee)}</span>
                            </div>
                            <div className="border-t border-warm-cream/10 pt-2 flex justify-between text-base font-bold text-warm-cream">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Payment Method</label>
                                <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Payment Status</label>
                                <select className={inputClass} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)}>
                                    <option value="payment_confirmed">Confirmed</option>
                                    <option value="payment_submitted">Submitted</option>
                                    <option value="awaiting_payment">Awaiting Payment</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Order Status</label>
                                <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                                    <option value="pending">Pending</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Delivery ── */}
                    <div className={sectionClass}>
                        <h3 className="text-sm font-semibold text-warm-cream flex items-center gap-2 mb-4">
                            <Truck size={14} className="text-brand-green" /> Delivery Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Delivery Zone</label>
                                <input className={inputClass} value={deliveryZone} onChange={(e) => setDeliveryZone(e.target.value)} placeholder="e.g. Lagos Mainland" />
                            </div>
                            <div>
                                <label className={labelClass}>Delivery Type</label>
                                <select className={inputClass} value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as any)}>
                                    <option value="doorstep">Doorstep Delivery</option>
                                    <option value="hub_pickup">Hub Pickup</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Notes ── */}
                    <div className={sectionClass}>
                        <h3 className="text-sm font-semibold text-warm-cream flex items-center gap-2 mb-4">
                            <FileText size={14} className="text-brand-green" /> Notes
                        </h3>
                        <textarea
                            className={`${inputClass} min-h-[80px] resize-y`}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal notes about this order..."
                        />
                    </div>

                    {/* ── Submit ── */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Plus size={16} />
                                    Create Order
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
