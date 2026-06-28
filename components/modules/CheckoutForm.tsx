"use client";

import Button from "@/components/ui/Button";
import { useCartStore } from "@/lib/cartStore";
import { useOrderStore } from "@/lib/orderStore";
import {
    LAGOS_ZONES as HARDCODED_LAGOS_ZONES,
    LAGOS_TERMS,
    fetchDeliveryPricingFromDB,
    applyDiscount,
    type LagosZoneInfo,
    type DbPricingResult,
} from "@/lib/deliveryPricing";
import type { ShippingAddress, Order, SiteSettings } from "@/types";
import { getSiteSettings } from "@/lib/queries";
import DeliveryScheduler from "@/components/modules/DeliveryScheduler";
import {
    Lock, Truck, Building2, ChevronDown, Package, Tag, UtensilsCrossed,
    CalendarCheck, ShieldCheck, CreditCard,
} from "lucide-react";
import Script from "next/script";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

interface CheckoutFormProps {
    onComplete: (orderInfo: { orderId: string; total: number }) => void;
    onShippingChange: (fee: number) => void;
    onPackagingChange: (fee: number) => void;
    onProcessingFeeChange?: (fee: number) => void;
}

const emptyAddress: ShippingAddress = {
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", state: "Lagos", zip: "", country: "Nigeria",
};

function generateOrderId(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const seq = Math.random().toString(16).slice(2, 6).toUpperCase().padStart(4, "0");
    return `ZY-${y}${m}${d}-${seq}`;
}

/**
 * Fee math — an EXACT mirror of lib/paystack.ts (`paystackFeeKobo` +
 * `customerProcessingFeeKobo`). Must compute in KOBO, not naira, or rounding
 * diverges from the server (ceil(naira*100*0.015) ≠ ceil(naira*0.015)*100) and
 * the "You'll be charged" line disagrees with the real charge. Server value is
 * always authoritative; this just keeps the preview honest.
 */
function paystackFeeKobo(grossKobo: number): number {
    if (grossKobo <= 250_000) return 0; // ≤ ₦2500 waived
    const raw = Math.ceil(grossKobo * 0.015) + 10_000; // 1.5% + ₦100
    return Math.min(raw, 200_000); // cap at ₦2000
}
/** Returns the customer-borne processing fee in NAIRA (mirrors server kobo math). */
function customerProcessingFee(baseNaira: number): number {
    const baseKobo = Math.round(baseNaira * 100);
    let customerKobo = 0;
    for (let i = 0; i < 3; i++) {
        customerKobo = Math.ceil(paystackFeeKobo(baseKobo + customerKobo) / 2);
    }
    return customerKobo / 100;
}

declare global {
    interface Window {
        PaystackPop?: new () => {
            resumeTransaction: (
                accessCode: string,
                hooks?: {
                    onSuccess?: (tx: { reference: string }) => void;
                    onCancel?: () => void;
                    onError?: (err: { message?: string }) => void;
                },
            ) => void;
        };
    }
}

export default function CheckoutForm({
    onComplete,
    onShippingChange,
    onPackagingChange,
    onProcessingFeeChange,
}: CheckoutFormProps) {
    const [form, setForm] = useState<ShippingAddress>(emptyAddress);
    const [loading, setLoading] = useState(false);
    // Stash the in-flight order draft so the Paystack onSuccess closure can save
    // it client-side. A ref (not a render-local `let`) so a re-render between
    // submit and onSuccess can't drop it.
    const orderDraftRef = useRef<Partial<Order>>({});
    const [stage, setStage] = useState<"idle" | "creating" | "awaiting_payment">("idle");
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const { items, subtotal, clearCart, couponCode, discount, removeCoupon } = useCartStore();
    const { addOrder } = useOrderStore();

    const [dbPricing, setDbPricing] = useState<DbPricingResult | null>(null);
    const [_pricingLoaded, setPricingLoaded] = useState(false);
    const [packagingConfig, setPackagingConfig] = useState({
        fee: 500,
        label: "Premium Packaging",
        description: "Insulated gift-ready packaging with ice packs for extended freshness",
    });
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        fetchDeliveryPricingFromDB().then((result) => {
            if (result) setDbPricing(result);
            setPricingLoaded(true);
        });
        getSiteSettings().then((s) => {
            if (s) {
                setSettings(s);
                setPackagingConfig({
                    fee: s.packagingFee ?? 500,
                    label: s.packagingLabel || "Premium Packaging",
                    description: s.packagingDescription || "Insulated gift-ready packaging with ice packs for extended freshness",
                });
            }
        });
    }, []);

    const lagosZonesRaw: LagosZoneInfo[] = dbPricing?.lagosZones ?? HARDCODED_LAGOS_ZONES;
    const lagosZones = lagosZonesRaw.filter((z, i, arr) => arr.findIndex((x) => x.key === z.key) === i);

    const lagosAreaIndex = useMemo(() => {
        const map = new Map<string, LagosZoneInfo>();
        for (const zone of lagosZones) {
            for (const area of zone.areas) map.set(area.toLowerCase(), zone);
        }
        return map;
    }, [lagosZones]);

    const [selectedLagosArea, setSelectedLagosArea] = useState("");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [prepInstructions, setPrepInstructions] = useState("");
    const [requestedDeliveryDate, setRequestedDeliveryDate] = useState("");
    const [addPackaging, setAddPackaging] = useState(false);

    const currentLagosZone: LagosZoneInfo | null = useMemo(
        () => (selectedLagosArea ? lagosAreaIndex.get(selectedLagosArea.toLowerCase()) ?? null : null),
        [selectedLagosArea, lagosAreaIndex],
    );

    const activeDiscount = useMemo(() => {
        if (!dbPricing?.discounts || !currentLagosZone) return null;
        return dbPricing.discounts.get(currentLagosZone.label) ?? null;
    }, [dbPricing, currentLagosZone]);

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

    useEffect(() => {
        onPackagingChange(addPackaging ? packagingConfig.fee : 0);
    }, [addPackaging, onPackagingChange, packagingConfig.fee]);

    // ── Compute base + processing fee for live cart display ──
    const baseTotal = useMemo(() => {
        const sub = subtotal();
        const couponDisc = discount > 0 ? sub * (discount / 100) : 0;
        const packFee = addPackaging ? packagingConfig.fee : 0;
        const prepFee = items.reduce((sum, item) => {
            if (item.selectedPrepOptions && item.selectedPrepOptions.length > 0) {
                return sum + item.selectedPrepOptions.reduce((s, o) => s + o.extraFee, 0) * item.quantity;
            }
            return sum;
        }, 0);
        return Math.max(0, sub - couponDisc) + deliveryFee + packFee + prepFee;
    }, [subtotal, discount, addPackaging, packagingConfig.fee, items, deliveryFee]);

    const processingFee = useMemo(() => customerProcessingFee(baseTotal), [baseTotal]);

    useEffect(() => {
        onProcessingFeeChange?.(processingFee);
    }, [processingFee, onProcessingFeeChange]);

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

    const openPaystackPopup = (accessCode: string, orderId: string, total: number) => {
        if (!window.PaystackPop) {
            toast.error("Payment SDK didn't load. Please refresh the page and try again.");
            setLoading(false);
            setStage("idle");
            return;
        }
        const popup = new window.PaystackPop();
        popup.resumeTransaction(accessCode, {
            onSuccess: (tx) => {
                addOrder({
                    ...orderDraftRef.current,
                    id: orderId,
                    total,
                } as Order);
                clearCart();
                removeCoupon();
                window.location.href = `/checkout/verify?reference=${encodeURIComponent(tx.reference)}`;
            },
            onCancel: () => {
                toast("Payment cancelled. Your order is reserved for 15 minutes — try again to complete it.");
                setLoading(false);
                setStage("idle");
            },
            onError: (err) => {
                toast.error(`Payment error: ${err.message ?? "unknown"}`);
                setLoading(false);
                setStage("idle");
            },
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return; // guard against double-submit (Enter key / rapid clicks)
        if (!validate()) return;
        setLoading(true);
        setStage("creating");

        const sub = subtotal();
        const ship = deliveryFee;
        const packFee = addPackaging ? packagingConfig.fee : 0;
        const couponDisc = discount > 0 ? sub * (discount / 100) : 0;
        const totalDiscount = couponDisc;
        const prepFee = items.reduce((s, item) => {
            if (item.selectedPrepOptions?.length) {
                return s + item.selectedPrepOptions.reduce((acc, o) => acc + o.extraFee, 0) * item.quantity;
            }
            return s;
        }, 0);

        const baseOrderTotal = Math.max(0, sub - totalDiscount) + ship + packFee + prepFee;
        const orderId = generateOrderId();

        const order: Order = {
            id: orderId,
            customerName: `${form.firstName} ${form.lastName}`,
            email: form.email.trim().toLowerCase(),
            phone: form.phone,
            items: [...items],
            subtotal: sub,
            shipping: ship,
            total: baseOrderTotal, // server will add processing fee + persist new total
            status: "pending",
            createdAt: new Date().toISOString(),
            shippingAddress: {
                ...form,
                city: selectedLagosArea,
                state: "Lagos",
                country: "Nigeria",
            },
            couponCode: couponCode || undefined,
            discountTotal: totalDiscount > 0 ? totalDiscount : undefined,
            deliveryZone: currentLagosZone?.label,
            deliveryType: "doorstep",
            deliveryDiscount:
                activeDiscount && activeDiscount.percent > 0 ? activeDiscount : undefined,
            deliveryFee: ship,
            packagingFee: packFee > 0 ? packFee : undefined,
            prepFee: prepFee > 0 ? prepFee : undefined,
            prepInstructions: prepInstructions.trim() || undefined,
            requestedDeliveryDate: requestedDeliveryDate || undefined,
        };

        orderDraftRef.current = order;

        try {
            const res = await fetch("/api/paystack/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                const errMsg = data.error || "Failed to start checkout. Please try again.";
                toast.error(errMsg.toLowerCase().includes("stock") ? "Out of Stock" : errMsg, {
                    description: errMsg.toLowerCase().includes("stock") ? errMsg : undefined,
                    duration: 6000,
                });
                setLoading(false);
                setStage("idle");
                return;
            }

            setStage("awaiting_payment");
            openPaystackPopup(data.accessCode, data.orderId, data.totalCharged);
            // Surface the final-final total in the parent so a Receipt could pick it up:
            onComplete({ orderId: data.orderId, total: data.totalCharged });
        } catch (err) {
            console.error("Checkout error:", err);
            toast.error("Something went wrong. Please check your connection and try again.");
            setLoading(false);
            setStage("idle");
        }
    };

    if (stage !== "idle" && loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-warm-cream/20 border-t-brand-red animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        {stage === "creating" ? (
                            <Package size={20} className="text-brand-red" />
                        ) : (
                            <CreditCard size={20} className="text-brand-red" />
                        )}
                    </div>
                </div>
                <h2 className="font-serif text-xl text-warm-cream mb-2">
                    {stage === "creating" ? "Reserving Your Order" : "Opening Secure Checkout"}
                </h2>
                <p className="text-sm text-warm-cream/50 max-w-xs leading-relaxed">
                    {stage === "creating"
                        ? "Confirming stock and locking in your selection — almost there."
                        : "Paystack is loading. Don't close this tab — the secure payment window will appear in a moment."}
                </p>
            </div>
        );
    }

    return (
        <>
            <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Step 1: Contact */}
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

                {/* Step 2: Delivery */}
                <div>
                    <SectionTitle step={2}>Delivery Details (Lagos Only)</SectionTitle>
                    <div className="mt-5 space-y-4">
                        <FloatingField label="Street Address" name="address" value={form.address} error={errors.address} onChange={handleChange} />
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
                                        <li key={i} className="flex items-start gap-2 text-[11px] text-warm-cream/45 leading-relaxed">
                                            <span className="mt-1 w-1 h-1 rounded-full bg-warm-cream/20 shrink-0" />
                                            {term}
                                        </li>
                                    ))}
                                </ul>
                            </DeliveryResultCard>
                        )}
                    </div>
                </div>

                {/* Step 3: Schedule */}
                <div>
                    <SectionTitle step={3}>Preferred Delivery Date</SectionTitle>
                    <div className="mt-5">
                        <DeliveryScheduler
                            onSelect={(date) => setRequestedDeliveryDate(date)}
                            selectedDate={requestedDeliveryDate}
                            cutoffHour={settings?.deliveryCutoffHour ?? 12}
                        />
                        {!requestedDeliveryDate && (
                            <p className="text-[11px] text-warm-cream/35 mt-3 flex items-center gap-1.5">
                                <CalendarCheck size={12} />
                                Optional — select a preferred delivery date
                            </p>
                        )}
                    </div>
                </div>

                {/* Step 4: Prep & Packaging */}
                <div>
                    <SectionTitle step={4}>Preparation Preferences</SectionTitle>
                    <div className="mt-5 space-y-4">
                        <div className="relative">
                            <textarea
                                value={prepInstructions}
                                onChange={(e) => setPrepInstructions(e.target.value)}
                                placeholder="Any special preparation instructions? e.g. 'Debone the chicken', 'Cut into thin strips', 'Season with suya spice'..."
                                rows={3}
                                maxLength={500}
                                className="w-full border border-warm-cream/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 transition-all bg-[#222] placeholder:text-warm-cream/25 resize-none"
                            />
                            <div className="flex items-center justify-between mt-1.5 px-1">
                                <div className="flex items-center gap-1.5 text-warm-cream/30">
                                    <UtensilsCrossed size={11} />
                                    <span className="text-[10px]">Optional</span>
                                </div>
                                <span className="text-[10px] text-warm-cream/25">{prepInstructions.length}/500</span>
                            </div>
                        </div>

                        <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${addPackaging ? "border-brand-green bg-brand-green/[0.04] shadow-sm shadow-brand-green/5" : "border-warm-cream/8 hover:border-brand-green/30"}`}>
                            <input
                                type="checkbox"
                                checked={addPackaging}
                                onChange={(e) => setAddPackaging(e.target.checked)}
                                className="mt-1 accent-brand-green"
                            />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package size={16} className="text-brand-green" />
                                        <span className="font-medium text-warm-cream text-sm">{packagingConfig.label}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-warm-cream">₦{packagingConfig.fee.toLocaleString()}</span>
                                </div>
                                <span className="block text-xs text-warm-cream/45 mt-1">{packagingConfig.description}</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Step 5: Payment summary (replaces method picker) */}
                <div>
                    <SectionTitle step={5}>Secure Payment</SectionTitle>
                    <div className="mt-5 rounded-xl border border-brand-green/20 bg-brand-green/[0.04] p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center">
                                <ShieldCheck size={18} className="text-brand-green" />
                            </span>
                            <div>
                                <p className="text-sm font-medium text-warm-cream">Pay with Paystack</p>
                                <p className="text-[11px] text-warm-cream/50">
                                    Card, Bank Transfer, USSD, QR — all secured by Paystack.
                                </p>
                            </div>
                        </div>
                        <div className="text-[11px] text-warm-cream/50 border-t border-warm-cream/10 pt-3 space-y-1">
                            <div className="flex justify-between">
                                <span>Order total</span>
                                <span className="text-warm-cream">₦{baseTotal.toLocaleString()}</span>
                            </div>
                            {processingFee > 0 && (
                                <div className="flex justify-between">
                                    <span>Processing fee</span>
                                    <span className="text-warm-cream">₦{processingFee.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-semibold pt-1 border-t border-warm-cream/10 mt-2">
                                <span className="text-warm-cream">You'll be charged</span>
                                <span className="text-brand-green">₦{(baseTotal + processingFee).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-warm-cream/30">
                    <Lock size={10} />
                    <span>Your information is encrypted and processed by Paystack — we never see your card details.</span>
                </div>

                <Button type="submit" size="lg" className="w-full" loading={loading}>
                    <span className="flex items-center justify-center gap-2">
                        <CreditCard size={16} />
                        Pay ₦{(baseTotal + processingFee).toLocaleString()} Securely
                    </span>
                </Button>
            </form>
        </>
    );
}

// ───── subcomponents ─────

function SectionTitle({ children, step }: { children: React.ReactNode; step: number }) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-brand-dark text-white text-xs font-bold flex items-center justify-center shrink-0">
                {step}
            </span>
            <h2 className="font-serif text-lg text-warm-cream">{children}</h2>
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
                className={`peer w-full border rounded-xl px-4 pt-5 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 transition-all bg-[#222] ${error ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "border-warm-cream/10"}`}
            />
            <label
                htmlFor={name}
                className="absolute left-4 top-2 text-[10px] text-warm-cream/40 transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-brand-green uppercase tracking-wide font-medium"
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
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-cream/30 pointer-events-none">{icon}</div>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full border rounded-xl pl-10 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 transition-all bg-[#222] appearance-none cursor-pointer ${error ? "border-red-300" : "border-warm-cream/10"} ${!value ? "text-warm-cream/40" : "text-warm-cream"}`}
                >
                    <option value="">{placeholder}</option>
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-cream/30 pointer-events-none">
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
        <div className="rounded-xl bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-warm-cream/10 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-warm-cream/70">
                    <span className="text-brand-green">{icon}</span>
                    <span className="text-sm font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {originalFee && originalFee !== fee && (
                        <span className="text-xs text-warm-cream/30 line-through">₦{originalFee.toLocaleString()}</span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-brand-green/10 text-brand-green border-brand-green/20">
                        <Truck size={11} />
                        ₦{fee.toLocaleString()}
                    </span>
                </div>
            </div>
            {discount && discount.percent > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-brand-green/10 rounded-lg border border-brand-green/20">
                    <Tag size={12} className="text-brand-green" />
                    <span className="text-xs text-brand-green font-medium">
                        {discount.percent}% delivery discount{discount.label ? ` — ${discount.label}` : ""}
                    </span>
                </div>
            )}
            {children}
        </div>
    );
}
