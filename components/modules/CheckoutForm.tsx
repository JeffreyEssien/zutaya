"use client";

import Button from "@/components/ui/Button";
import { useCartStore } from "@/lib/cartStore";
import { useOrderStore } from "@/lib/orderStore";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import {
    LAGOS_ZONES as HARDCODED_LAGOS_ZONES,
    LAGOS_TERMS,
    fetchDeliveryPricingFromDB,
    applyDiscount,
    type LagosZoneInfo,
    type DbPricingResult,
} from "@/lib/deliveryPricing";
import type { ShippingAddress, Order } from "@/types";
import {
    MessageCircle, Clock, Lock, Truck, Building2,
    ChevronDown, Package, Tag,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

interface CheckoutFormProps {
    onComplete: (orderInfo?: { orderId: string; total: number; paymentMethod: "whatsapp" | "bank_transfer" }) => void;
    onShippingChange: (fee: number) => void;
}

const emptyAddress: ShippingAddress = {
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", state: "Lagos", zip: "", country: "Nigeria",
};

export default function CheckoutForm({ onComplete, onShippingChange }: CheckoutFormProps) {
    const [form, setForm] = useState<ShippingAddress>(emptyAddress);
    const [loading, setLoading] = useState(false);
    const [queueStatus, setQueueStatus] = useState<"idle" | "queued" | "processing">("idle");
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const { items, subtotal, clearCart, couponCode, discount, removeCoupon } = useCartStore();
    const { addOrder } = useOrderStore();

    // ── DB pricing state ──
    const [dbPricing, setDbPricing] = useState<DbPricingResult | null>(null);
    const [pricingLoaded, setPricingLoaded] = useState(false);

    useEffect(() => {
        fetchDeliveryPricingFromDB().then((result) => {
            if (result) setDbPricing(result);
            setPricingLoaded(true);
        });
    }, []);

    const lagosZonesRaw: LagosZoneInfo[] = dbPricing?.lagosZones ?? HARDCODED_LAGOS_ZONES;
    const lagosZones = lagosZonesRaw.filter((z, i, arr) => arr.findIndex((x) => x.key === z.key) === i);

    const lagosAreaIndex = useMemo(() => {
        const map = new Map<string, LagosZoneInfo>();
        for (const zone of lagosZones) {
            for (const area of zone.areas) {
                map.set(area.toLowerCase(), zone);
            }
        }
        return map;
    }, [lagosZones]);

    // ── Delivery state ──
    const [selectedLagosArea, setSelectedLagosArea] = useState("");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<"whatsapp" | "manual">("whatsapp");

    const currentLagosZone: LagosZoneInfo | null = useMemo(
        () => (selectedLagosArea ? lagosAreaIndex.get(selectedLagosArea.toLowerCase()) ?? null : null),
        [selectedLagosArea, lagosAreaIndex]
    );

    const activeDiscount = useMemo(() => {
        if (!dbPricing?.discounts || !currentLagosZone) return null;
        return dbPricing.discounts.get(currentLagosZone.label) ?? null;
    }, [dbPricing, currentLagosZone]);

    // ── Fee computation ──
    const computeFee = useCallback((): number => {
        let rawFee = currentLagosZone?.fee ?? 0;
        if (activeDiscount && activeDiscount.percent > 0) {
            rawFee = applyDiscount(rawFee, activeDiscount.percent);
        }
        return rawFee;
    }, [currentLagosZone, activeDiscount]);

    useEffect(() => {
        const fee = computeFee();
        setDeliveryFee(fee);
        onShippingChange(fee);
    }, [computeFee, onShippingChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.firstName.trim()) e.firstName = "Required";
        if (!form.lastName.trim()) e.lastName = "Required";
        if (!form.email.trim()) e.email = "Required";
        if (!form.phone.trim()) e.phone = "Required";
        if (!form.address.trim()) e.address = "Required";
        if (!selectedLagosArea) e.lagosArea = "Please select your area";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);

        const sub = subtotal();
        const ship = deliveryFee;
        const discountAmount = sub * (discount / 100);

        const locationDesc = `${selectedLagosArea}, Lagos (${currentLagosZone?.label})`;

        const order: Order = {
            id: `ORD-${Date.now().toString(36).toUpperCase()}`,
            customerName: `${form.firstName} ${form.lastName}`,
            email: form.email,
            phone: form.phone,
            items: [...items],
            subtotal: sub,
            shipping: ship,
            total: Math.max(0, sub - discountAmount) + ship,
            status: "pending",
            createdAt: new Date().toISOString(),
            shippingAddress: {
                ...form,
                city: selectedLagosArea,
                state: "Lagos",
                country: "Nigeria",
            },
            couponCode: couponCode || undefined,
            discountTotal: discountAmount > 0 ? discountAmount : undefined,
            paymentMethod: paymentMethod === "whatsapp" ? "whatsapp" : "bank_transfer",
            paymentStatus: paymentMethod === "manual" ? "awaiting_payment" : undefined,
            deliveryZone: currentLagosZone?.label,
            deliveryType: "doorstep",
            deliveryDiscount: activeDiscount && activeDiscount.percent > 0 ? activeDiscount : undefined,
        };

        try {
            setQueueStatus("queued");

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });

            setQueueStatus("processing");
            const data = await res.json();

            if (!res.ok || !data.success) {
                console.error("Order failed:", data);
                const errMsg = data.error || "Failed to place order. Please try again.";
                if (errMsg.toLowerCase().includes("insufficient stock")) {
                    toast.error("Out of Stock", { description: errMsg, duration: 6000 });
                } else {
                    toast.error(errMsg, { duration: 5000 });
                }
                setLoading(false);
                setQueueStatus("idle");
                return;
            }

            addOrder(order);
            clearCart();
            removeCoupon();
            setLoading(false);

            if (paymentMethod === "whatsapp") {
                const message = encodeURIComponent(
                    `*New Order: ${order.id}*\n\n` +
                    `*Customer:* ${order.customerName}\n` +
                    `*Email:* ${order.email}\n` +
                    `*Phone:* ${order.phone}\n\n` +
                    `*Delivery To:* ${locationDesc}\n` +
                    `*Address:* ${form.address}\n\n` +
                    `*Items:*\n` +
                    order.items.map(i => `  • ${i.quantity}x ${i.product.name} (${i.variant?.name || 'Default'})`).join('\n') +
                    `\n\n*Subtotal:* ₦${sub.toLocaleString()}` +
                    (discountAmount > 0 ? `\n*Discount:* -₦${discountAmount.toLocaleString()}` : '') +
                    `\n*Delivery Fee:* ₦${ship.toLocaleString()}` +
                    (activeDiscount ? `\n*Delivery Discount:* ${activeDiscount.percent}% off${activeDiscount.label ? ` (${activeDiscount.label})` : ''}` : '') +
                    `\n*Total:* ₦${order.total.toLocaleString()}\n\n` +
                    `I would like to pay for this order.`
                );
                window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
            } else {
                onComplete({ orderId: order.id, total: order.total, paymentMethod: "bank_transfer" });
            }
        } catch (err) {
            console.error("Order submission error:", err);
            toast.error("Something went wrong. Please check your connection and try again.");
            setLoading(false);
            setQueueStatus("idle");
        }
    };

    // ═══════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════

    if (queueStatus !== "idle" && loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-warm-tan/20 border-t-brand-red animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Package size={20} className="text-brand-red" />
                    </div>
                </div>
                <h2 className="font-serif text-xl text-brand-dark mb-2">
                    {queueStatus === "queued" ? "You're in the Queue" : "Processing Your Order"}
                </h2>
                <p className="text-sm text-brand-dark/50 max-w-xs leading-relaxed">
                    {queueStatus === "queued"
                        ? "We're preparing to process your order. Please hold tight — this only takes a moment."
                        : "Confirming stock and finalising your order. Almost there..."}
                </p>
                <div className="flex items-center gap-3 mt-6">
                    <span className={`w-2.5 h-2.5 rounded-full ${queueStatus === "queued" ? "bg-amber-400 animate-pulse" : "bg-green-500"}`} />
                    <span className="text-xs text-brand-dark/40 uppercase tracking-wider font-medium">
                        {queueStatus === "queued" ? "Queued" : "Processing"}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* ── Step 1: Contact ── */}
            <div>
                <SectionTitle step={1}>Contact Information</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                    <FloatingField label="First Name" name="firstName" value={form.firstName} error={errors.firstName} onChange={handleChange} />
                    <FloatingField label="Last Name" name="lastName" value={form.lastName} error={errors.lastName} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <FloatingField label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={handleChange} />
                    <FloatingField label="Phone" name="phone" type="tel" value={form.phone} error={errors.phone} onChange={handleChange} />
                </div>
            </div>

            {/* ── Step 2: Delivery ── */}
            <div>
                <SectionTitle step={2}>Delivery Details (Lagos Only)</SectionTitle>
                <div className="mt-5 space-y-4">
                    <FloatingField label="Street Address" name="address" value={form.address} error={errors.address} onChange={handleChange} />

                    {/* Lagos Area Selector */}
                    <SelectField
                        icon={<Building2 size={16} />}
                        value={selectedLagosArea}
                        placeholder="Select your area in Lagos"
                        error={errors.lagosArea}
                        onChange={(val) => {
                            setSelectedLagosArea(val);
                            setErrors((prev) => ({ ...prev, lagosArea: undefined }));
                        }}
                    >
                        {lagosZones.map((zone) => (
                            <optgroup key={zone.key} label={`${zone.label} — ₦${zone.fee.toLocaleString()}`}>
                                {zone.areas.map((area) => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </optgroup>
                        ))}
                    </SelectField>

                    {/* Lagos zone result */}
                    {currentLagosZone && (
                        <DeliveryResultCard
                            icon={<Truck size={16} />}
                            title={currentLagosZone.label}
                            fee={deliveryFee}
                            originalFee={activeDiscount ? currentLagosZone.fee : undefined}
                            discount={activeDiscount}
                        >
                            <ul className="space-y-1.5">
                                {LAGOS_TERMS.map((term, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[11px] text-brand-dark/45 leading-relaxed">
                                        <span className="mt-1 w-1 h-1 rounded-full bg-brand-dark/20 shrink-0" />
                                        {term}
                                    </li>
                                ))}
                            </ul>
                        </DeliveryResultCard>
                    )}
                </div>
            </div>

            {/* ── Step 3: Payment ── */}
            <div>
                <SectionTitle step={3}>Payment Method</SectionTitle>
                <div className="space-y-3 mt-5">
                    <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${paymentMethod === 'whatsapp' ? 'border-brand-purple bg-brand-purple/[0.04] shadow-sm shadow-brand-purple/5' : 'border-brand-dark/8 hover:border-brand-purple/30'}`}>
                        <input type="radio" name="payment" value="whatsapp" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} className="mt-1 accent-brand-purple" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <MessageCircle size={16} className="text-brand-purple" />
                                <span className="font-medium text-brand-dark text-sm">Pay on WhatsApp</span>
                            </div>
                            <span className="block text-xs text-brand-dark/45 mt-1">Chat with us to complete your payment. Fast & secure.</span>
                        </div>
                    </label>

                    <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${paymentMethod === 'manual' ? 'border-brand-purple bg-brand-purple/[0.04] shadow-sm shadow-brand-purple/5' : 'border-brand-dark/8 hover:border-brand-purple/30'}`}>
                        <input type="radio" name="payment" value="manual" checked={paymentMethod === 'manual'} onChange={() => setPaymentMethod('manual')} className="mt-1 accent-brand-purple" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-brand-purple" />
                                <span className="font-medium text-brand-dark text-sm">Wait for Admin Confirmation</span>
                            </div>
                            <span className="block text-xs text-brand-dark/45 mt-1">Place order now and wait for an admin to contact you for payment.</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Security notice */}
            <div className="flex items-center gap-2 text-[10px] text-brand-dark/30">
                <Lock size={10} />
                <span>Your information is protected and secure</span>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
                {paymentMethod === 'whatsapp' ? "Place Order & Chat on WhatsApp" : "Place Order"}
            </Button>
        </form>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function SectionTitle({ children, step }: { children: React.ReactNode; step: number }) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-brand-dark text-white text-xs font-bold flex items-center justify-center shrink-0">
                {step}
            </span>
            <h2 className="font-serif text-lg text-brand-dark">{children}</h2>
        </div>
    );
}

function FloatingField({ label, name, type = "text", value, error, onChange }: {
    label: string; name: string; type?: string; value: string; error?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="relative">
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder=" "
                className={`peer w-full border rounded-xl px-4 pt-5 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple/40 transition-all bg-white ${error ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "border-brand-dark/10"}`}
            />
            <label
                htmlFor={name}
                className="absolute left-4 top-2 text-[10px] text-brand-dark/40 transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-brand-purple uppercase tracking-wide font-medium"
            >
                {label}
            </label>
            {error && <p className="text-red-500 text-[10px] mt-1 ml-1">{error}</p>}
        </div>
    );
}

function SelectField({ icon, value, placeholder, error, children, onChange }: {
    icon: React.ReactNode;
    value: string;
    placeholder: string;
    error?: string;
    children: React.ReactNode;
    onChange: (val: string) => void;
}) {
    return (
        <div>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/30 pointer-events-none">{icon}</div>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full border rounded-xl pl-10 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple/40 transition-all bg-white appearance-none cursor-pointer ${error ? "border-red-300" : "border-brand-dark/10"} ${!value ? "text-brand-dark/40" : "text-brand-dark"}`}
                >
                    <option value="">{placeholder}</option>
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/30 pointer-events-none">
                    <ChevronDown size={14} />
                </div>
            </div>
            {error && <p className="text-red-500 text-[10px] mt-1.5 ml-1">{error}</p>}
        </div>
    );
}

function DeliveryResultCard({ icon, title, fee, originalFee, discount, children }: {
    icon: React.ReactNode;
    title: string;
    fee: number;
    originalFee?: number;
    discount?: { percent: number; label: string | null } | null;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl bg-gradient-to-br from-neutral-50/80 to-white border border-brand-dark/5 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-brand-dark/70">
                    <span className="text-brand-purple">{icon}</span>
                    <span className="text-sm font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {originalFee && originalFee !== fee && (
                        <span className="text-xs text-brand-dark/30 line-through">₦{originalFee.toLocaleString()}</span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                        <Truck size={11} />
                        ₦{fee.toLocaleString()}
                    </span>
                </div>
            </div>
            {discount && discount.percent > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <Tag size={12} className="text-emerald-600" />
                    <span className="text-xs text-emerald-700 font-medium">
                        {discount.percent}% delivery discount{discount.label ? ` — ${discount.label}` : ""}
                    </span>
                </div>
            )}
            {children}
        </div>
    );
}
