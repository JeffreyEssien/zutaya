"use client";

import Button from "@/components/ui/Button";
import { useCartStore } from "@/lib/cartStore";
import { useOrderStore } from "@/lib/orderStore";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import {
    NIGERIAN_STATES,
    LAGOS_ZONES as HARDCODED_LAGOS_ZONES,
    INTERSTATE_DATA as HARDCODED_INTERSTATE,
    INTERSTATE_TERMS,
    LAGOS_TERMS,
    isLagos,
    lookupLagosZone as hardcodedLookupLagosZone,
    getInterstateState as hardcodedGetInterstateState,
    getInterstateFee as hardcodedGetInterstateFee,
    fetchDeliveryPricingFromDB,
    applyDiscount,
    type DeliveryType,
    type LagosZoneInfo,
    type InterstateState,
    type DbPricingResult,
} from "@/lib/deliveryPricing";
import type { ShippingAddress, Order } from "@/types";
import {
    MessageCircle, Clock, Lock, MapPin, Truck, Building2,
    ChevronDown, Info, Package, Tag, Archive,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

interface CheckoutFormProps {
    onComplete: (orderInfo?: { orderId: string; total: number; paymentMethod: "whatsapp" | "bank_transfer" }) => void;
    onShippingChange: (fee: number) => void;
}

const emptyAddress: ShippingAddress = {
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", state: "", zip: "", country: "Nigeria",
};

export default function CheckoutForm({ onComplete, onShippingChange }: CheckoutFormProps) {
    const [form, setForm] = useState<ShippingAddress>(emptyAddress);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const { items, subtotal, clearCart, couponCode, discount, removeCoupon } = useCartStore();
    const { addOrder } = useOrderStore();
    const [stockpileMode, setStockpileMode] = useState(false);

    // ── DB pricing state ──
    const [dbPricing, setDbPricing] = useState<DbPricingResult | null>(null);
    const [pricingLoaded, setPricingLoaded] = useState(false);

    // Load pricing from DB on mount
    useEffect(() => {
        fetchDeliveryPricingFromDB().then((result) => {
            if (result) setDbPricing(result);
            setPricingLoaded(true);
        });
    }, []);

    // Resolve the actual data source (DB or hardcoded)
    const lagosZonesRaw: LagosZoneInfo[] = dbPricing?.lagosZones ?? HARDCODED_LAGOS_ZONES;
    // Deduplicate by key (handles DB having duplicates from re-seeding)
    const lagosZones = lagosZonesRaw.filter((z, i, arr) => arr.findIndex((x) => x.key === z.key) === i);
    const interstateStates: InterstateState[] = dbPricing?.interstateStates ?? HARDCODED_INTERSTATE;

    // Build lookup maps from resolved data
    const lagosAreaIndex = useMemo(() => {
        const map = new Map<string, LagosZoneInfo>();
        for (const zone of lagosZones) {
            for (const area of zone.areas) {
                map.set(area.toLowerCase(), zone);
            }
        }
        return map;
    }, [lagosZones]);

    const interstateIndex = useMemo(() => {
        const map = new Map<string, InterstateState>();
        for (const s of interstateStates) {
            map.set(s.state.toLowerCase(), s);
        }
        return map;
    }, [interstateStates]);

    // ── Delivery state ──
    const [selectedState, setSelectedState] = useState("");
    const [selectedLagosArea, setSelectedLagosArea] = useState("");
    const [selectedInterstateCity, setSelectedInterstateCity] = useState("");
    const [deliveryType, setDeliveryType] = useState<DeliveryType>("doorstep");
    const [deliveryFee, setDeliveryFee] = useState(0);

    const [paymentMethod, setPaymentMethod] = useState<"whatsapp" | "manual">("whatsapp");

    // ── Derived state ──
    const lagosSelected = isLagos(selectedState);
    const interstateData = useMemo(
        () => (selectedState && !lagosSelected ? interstateIndex.get(selectedState.toLowerCase()) ?? null : null),
        [selectedState, lagosSelected, interstateIndex]
    );
    const currentLagosZone: LagosZoneInfo | null = useMemo(
        () => (lagosSelected && selectedLagosArea ? lagosAreaIndex.get(selectedLagosArea.toLowerCase()) ?? null : null),
        [lagosSelected, selectedLagosArea, lagosAreaIndex]
    );

    // Active discount for current zone
    const activeDiscount = useMemo(() => {
        if (!dbPricing?.discounts) return null;
        if (lagosSelected && currentLagosZone) {
            return dbPricing.discounts.get(currentLagosZone.label) ?? null;
        }
        if (interstateData) {
            return dbPricing.discounts.get(interstateData.state) ?? null;
        }
        return null;
    }, [dbPricing, lagosSelected, currentLagosZone, interstateData]);

    // ── Fee computation ──
    const computeFee = useCallback((): number => {
        let rawFee = 0;
        if (lagosSelected && currentLagosZone) {
            rawFee = currentLagosZone.fee;
        } else if (interstateData && selectedInterstateCity) {
            const city = interstateData.cities.find(
                (c) => c.name.toLowerCase() === selectedInterstateCity.toLowerCase()
            );
            if (city) {
                rawFee = deliveryType === "hub_pickup" ? city.hubPickup : city.doorstep;
            }
        }
        // Apply discount if any
        if (activeDiscount && activeDiscount.percent > 0) {
            rawFee = applyDiscount(rawFee, activeDiscount.percent);
        }
        return rawFee;
    }, [lagosSelected, currentLagosZone, interstateData, selectedInterstateCity, deliveryType, activeDiscount]);

    useEffect(() => {
        const fee = computeFee();
        setDeliveryFee(fee);
        onShippingChange(fee);
    }, [computeFee, onShippingChange]);

    // ── Handlers ──
    const handleStateChange = (state: string) => {
        setSelectedState(state);
        setSelectedLagosArea("");
        setSelectedInterstateCity("");
        setDeliveryType("doorstep");
        setForm((prev) => ({ ...prev, state }));
        setErrors((prev) => ({ ...prev, state: undefined, lagosArea: undefined, interstateCity: undefined }));
    };

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
        // Skip delivery validation in stockpile mode
        if (!stockpileMode) {
            if (!form.address.trim()) e.address = "Required";
            if (!selectedState) e.state = "Please select your state";
            if (lagosSelected && !selectedLagosArea) e.lagosArea = "Please select your area";
            if (!lagosSelected && interstateData && !selectedInterstateCity) e.interstateCity = "Please select your city";
            if (!lagosSelected && !interstateData && selectedState) e.state = "We don't deliver to this state yet — contact us via WhatsApp";
            if (!form.city.trim() && !lagosSelected) e.city = "Required";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);

        // ── Stockpile Mode ──
        if (stockpileMode) {
            try {
                // Check for existing stockpile
                let stockpileRes = await fetch(`/api/stockpile?email=${encodeURIComponent(form.email)}`);
                let stockpile = await stockpileRes.json();

                // Create new stockpile if none exists
                if (!stockpile?.id) {
                    const createRes = await fetch('/api/stockpile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'create',
                            customerEmail: form.email,
                            customerName: `${form.firstName} ${form.lastName}`,
                            phone: form.phone,
                        }),
                    });
                    stockpile = await createRes.json();
                }

                // Add each cart item to stockpile
                for (const item of items) {
                    await fetch('/api/stockpile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'add_item',
                            stockpileId: stockpile.id,
                            productId: item.product.id,
                            productName: item.product.name,
                            productImage: item.product.images?.[0] || item.variant?.image,
                            variantName: item.variant?.name,
                            quantity: item.quantity,
                            pricePaid: (item.variant?.price || item.product.price),
                        }),
                    });
                }

                clearCart();
                removeCoupon();
                setLoading(false);
                // Redirect to stockpile page
                window.location.href = `/stockpile?email=${encodeURIComponent(form.email)}&added=true`;
                return;
            } catch (err) {
                console.error('Stockpile error:', err);
                toast.error('Failed to add to stockpile. Please try again.');
                setLoading(false);
                return;
            }
        }

        // ── Normal Order Flow ──
        const sub = subtotal();
        const ship = deliveryFee;
        const discountAmount = sub * (discount / 100);

        const locationDesc = lagosSelected
            ? `${selectedLagosArea}, Lagos (${currentLagosZone?.label})`
            : `${selectedInterstateCity}, ${selectedState}`;
        const deliveryTypeLabel = lagosSelected
            ? "Doorstep"
            : deliveryType === "hub_pickup" ? "Hub Pickup" : "Doorstep";

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
                city: lagosSelected ? selectedLagosArea : form.city,
                state: selectedState,
                country: "Nigeria",
            },
            couponCode: couponCode || undefined,
            discountTotal: discountAmount > 0 ? discountAmount : undefined,
            paymentMethod: paymentMethod === "whatsapp" ? "whatsapp" : "bank_transfer",
            paymentStatus: paymentMethod === "manual" ? "awaiting_payment" : undefined,
            deliveryZone: lagosSelected
                ? currentLagosZone?.label
                : interstateData?.state,
            deliveryType: lagosSelected ? "doorstep" : deliveryType,
            deliveryDiscount: activeDiscount && activeDiscount.percent > 0 ? activeDiscount : undefined,
        };

        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                console.error("Order failed:", data);
                const errMsg = data.error || "Failed to place order. Please try again.";
                // Show user-friendly stock error messages
                if (errMsg.toLowerCase().includes("insufficient stock")) {
                    toast.error("Out of Stock", {
                        description: errMsg,
                        duration: 6000,
                    });
                } else {
                    toast.error(errMsg, { duration: 5000 });
                }
                setLoading(false);
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
                    `*Delivery Type:* ${deliveryTypeLabel}\n` +
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
        }
    };

    // ═══════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════

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
                <SectionTitle step={2}>Delivery Details</SectionTitle>
                <div className="mt-5 space-y-4">
                    <FloatingField label="Street Address" name="address" value={form.address} error={errors.address} onChange={handleChange} />

                    {/* State Selector */}
                    <SelectField
                        icon={<MapPin size={16} />}
                        value={selectedState}
                        placeholder="Select your state"
                        error={errors.state}
                        onChange={handleStateChange}
                    >
                        {NIGERIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </SelectField>

                    {/* ── Lagos Flow ── */}
                    {lagosSelected && (
                        <>
                            <SelectField
                                icon={<Building2 size={16} />}
                                value={selectedLagosArea}
                                placeholder="Select your area"
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
                                    title={`${currentLagosZone.label}`}
                                    fee={deliveryFee}
                                    originalFee={activeDiscount ? currentLagosZone.fee : undefined}
                                    discount={activeDiscount}
                                    badgeColor="emerald"
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
                        </>
                    )}

                    {/* ── Interstate Flow ── */}
                    {!lagosSelected && interstateData && (
                        <>
                            <SelectField
                                icon={<Building2 size={16} />}
                                value={selectedInterstateCity}
                                placeholder="Select your city"
                                error={errors.interstateCity}
                                onChange={(val) => {
                                    setSelectedInterstateCity(val);
                                    setErrors((prev) => ({ ...prev, interstateCity: undefined }));
                                }}
                            >
                                {interstateData.cities.map((c) => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </SelectField>

                            {/* Delivery type toggle */}
                            {selectedInterstateCity && (
                                <div className="space-y-2.5">
                                    <p className="text-xs text-brand-dark/50 font-medium uppercase tracking-wider">Choose Delivery Type</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(() => {
                                            const city = interstateData.cities.find(c => c.name === selectedInterstateCity);
                                            return (
                                                <>
                                                    <DeliveryTypeCard
                                                        label="Doorstep Delivery"
                                                        description="Delivered to your door"
                                                        estimate={interstateData.doorstepEstimate}
                                                        icon={<Truck size={18} />}
                                                        selected={deliveryType === "doorstep"}
                                                        price={city?.doorstep ?? null}
                                                        onClick={() => setDeliveryType("doorstep")}
                                                    />
                                                    <DeliveryTypeCard
                                                        label="Hub Pickup"
                                                        description="Collect from nearest hub"
                                                        estimate={interstateData.hubEstimate}
                                                        icon={<Building2 size={18} />}
                                                        selected={deliveryType === "hub_pickup"}
                                                        price={city?.hubPickup ?? null}
                                                        onClick={() => setDeliveryType("hub_pickup")}
                                                    />
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Interstate fee result + T&C */}
                            {selectedInterstateCity && deliveryFee > 0 && (
                                <DeliveryResultCard
                                    icon={<Package size={16} />}
                                    title={`${selectedInterstateCity}, ${selectedState}`}
                                    fee={deliveryFee}
                                    originalFee={activeDiscount ? (() => {
                                        const city = interstateData.cities.find(c => c.name === selectedInterstateCity);
                                        return city ? (deliveryType === "hub_pickup" ? city.hubPickup : city.doorstep) : undefined;
                                    })() : undefined}
                                    discount={activeDiscount}
                                    badgeColor="brand"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-dark/60 uppercase tracking-wider">
                                            <Info size={12} />
                                            Important Delivery Information
                                        </div>
                                        <ul className="space-y-2">
                                            {INTERSTATE_TERMS.map((term, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[11px] text-brand-dark/50 leading-relaxed">
                                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-purple/40 shrink-0" />
                                                    {term}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex items-start gap-2 px-3 py-2.5 bg-brand-purple/[0.04] rounded-lg border border-brand-purple/10">
                                            <Package size={12} className="text-brand-purple mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-brand-dark/50 leading-relaxed">
                                                Your delivery fee covers items up to 2 kg. Ordering heavier items? No problem — a small
                                                ₦1,000 per additional kg applies so we can get everything to you safely. Some remote
                                                locations may have a modest ₦500 surcharge.
                                            </p>
                                        </div>
                                    </div>
                                </DeliveryResultCard>
                            )}
                        </>
                    )}

                    {/* ── Unsupported state ── */}
                    {selectedState && !lagosSelected && !interstateData && (
                        <div className="rounded-xl bg-amber-50/50 border border-amber-200/50 p-5 space-y-3">
                            <div className="flex items-center gap-2 text-amber-700">
                                <Info size={16} />
                                <span className="text-sm font-semibold">Delivery Not Yet Available</span>
                            </div>
                            <p className="text-xs text-amber-600 leading-relaxed">
                                We don't currently have a delivery route to <strong>{selectedState}</strong>.
                                Please contact us directly via WhatsApp so we can arrange delivery for you.
                            </p>
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'd like to order for delivery to ${selectedState}. Can you help?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded-lg transition-colors"
                            >
                                <MessageCircle size={14} />
                                Contact Us on WhatsApp
                            </a>
                        </div>
                    )}

                    {/* Extra fields for interstate */}
                    {!lagosSelected && selectedState && (
                        <div className="grid grid-cols-2 gap-4">
                            <FloatingField label="City / Town" name="city" value={form.city} error={errors.city} onChange={handleChange} />
                            <FloatingField label="ZIP / Postal Code" name="zip" value={form.zip} error={errors.zip} onChange={handleChange} />
                        </div>
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

            {/* ── Stockpile Option ── */}
            <div className="bg-gradient-to-r from-brand-purple/[0.04] to-brand-lilac/[0.04] rounded-xl border border-brand-purple/10 p-5">
                <label className="flex items-start gap-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={stockpileMode}
                        onChange={(e) => setStockpileMode(e.target.checked)}
                        className="mt-1 accent-brand-purple w-4 h-4"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Archive size={16} className="text-brand-purple" />
                            <span className="font-medium text-brand-dark text-sm">Add to Stockpile Instead</span>
                        </div>
                        <span className="block text-xs text-brand-dark/45 mt-1 leading-relaxed">
                            Pay for these items now and keep shopping. When you're ready, ship everything together
                            with a single delivery fee. Items held for up to 14 days.
                        </span>
                    </div>
                </label>
            </div>

            {/* Security notice */}
            <div className="flex items-center gap-2 text-[10px] text-brand-dark/30">
                <Lock size={10} />
                <span>Your information is protected and secure</span>
            </div>

            <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={loading}
                disabled={!stockpileMode && selectedState && !lagosSelected && !interstateData ? true : false}
            >
                {stockpileMode
                    ? "Add to Stockpile & Pay Later for Shipping"
                    : paymentMethod === 'whatsapp' ? "Place Order & Chat on WhatsApp" : "Place Order"}
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

function DeliveryTypeCard({ label, description, estimate, icon, selected, price, onClick }: {
    label: string;
    description: string;
    estimate: string;
    icon: React.ReactNode;
    selected: boolean;
    price: number | null;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-4 border rounded-xl cursor-pointer transition-all duration-300 text-center ${selected
                ? "border-brand-purple bg-brand-purple/[0.04] shadow-sm shadow-brand-purple/5 ring-1 ring-brand-purple/15"
                : "border-brand-dark/8 hover:border-brand-purple/30"
                }`}
        >
            <div className={`${selected ? "text-brand-purple" : "text-brand-dark/30"} transition-colors`}>{icon}</div>
            <span className={`text-xs font-medium ${selected ? "text-brand-dark" : "text-brand-dark/60"}`}>{label}</span>
            <span className="text-[10px] text-brand-dark/35">{description}</span>
            {price !== null && (
                <span className={`text-sm font-bold mt-1 ${selected ? "text-brand-purple" : "text-brand-dark/40"}`}>
                    ₦{price.toLocaleString()}
                </span>
            )}
            <span className="text-[9px] text-brand-dark/25 mt-0.5">{estimate}</span>
        </button>
    );
}

function DeliveryResultCard({ icon, title, fee, originalFee, discount, badgeColor, children }: {
    icon: React.ReactNode;
    title: string;
    fee: number;
    originalFee?: number;
    discount?: { percent: number; label: string | null } | null;
    badgeColor: "emerald" | "brand";
    children: React.ReactNode;
}) {
    const badgeClasses = badgeColor === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-brand-purple/5 text-brand-purple border-brand-purple/10";

    return (
        <div className="rounded-xl bg-gradient-to-br from-neutral-50/80 to-white border border-brand-dark/5 p-5 space-y-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-brand-dark/70">
                    <span className="text-brand-purple">{icon}</span>
                    <span className="text-sm font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {originalFee && originalFee !== fee && (
                        <span className="text-xs text-brand-dark/30 line-through">₦{originalFee.toLocaleString()}</span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeClasses}`}>
                        <Truck size={11} />
                        ₦{fee.toLocaleString()}
                    </span>
                </div>
            </div>
            {/* Discount badge */}
            {discount && discount.percent > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <Tag size={12} className="text-emerald-600" />
                    <span className="text-xs text-emerald-700 font-medium">
                        {discount.percent}% delivery discount{discount.label ? ` — ${discount.label}` : ""}
                    </span>
                </div>
            )}
            {/* Body */}
            {children}
        </div>
    );
}
