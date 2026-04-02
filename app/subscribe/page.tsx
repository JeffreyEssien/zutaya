"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import { SITE_NAME } from "@/lib/constants";
import {
    RefreshCw, Plus, Minus, X, Check, ArrowRight, Package,
    Calendar, CreditCard, MapPin, User, ShoppingBag, Sparkles,
} from "lucide-react";

interface SubItemRow {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image?: string;
}

const FREQUENCY_OPTIONS = [
    { value: "weekly", label: "Weekly", desc: "Every 7 days", savings: "Best value" },
    { value: "biweekly", label: "Bi-weekly", desc: "Every 14 days", savings: "Popular" },
    { value: "monthly", label: "Monthly", desc: "Every 30 days", savings: null },
] as const;

export default function SubscribePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState(1);

    const [form, setForm] = useState({
        customerEmail: "",
        customerName: "",
        phone: "",
        frequency: "weekly" as "weekly" | "biweekly" | "monthly",
        paymentMethod: "bank_transfer",
        address: "",
        city: "",
        state: "",
    });

    const [items, setItems] = useState<SubItemRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetch("/api/products")
            .then((r) => r.json())
            .then((data) => {
                setProducts(data);
                setLoading(false);
            });
    }, []);

    const addItem = (product: Product) => {
        if (items.find((i) => i.productId === product.id)) return;
        setItems((prev) => [
            ...prev,
            {
                productId: product.id,
                productName: product.name,
                quantity: 1,
                price: product.price,
                image: product.images?.[0],
            },
        ]);
    };

    const updateItemQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setItems((prev) => prev.filter((i) => i.productId !== productId));
            return;
        }
        setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    };

    const removeItem = (productId: string) => {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;
        setSubmitting(true);

        const res = await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customerEmail: form.customerEmail,
                customerName: form.customerName,
                phone: form.phone || undefined,
                items: items.map((i) => ({
                    productId: i.productId,
                    productName: i.productName,
                    quantity: i.quantity,
                    price: i.price,
                })),
                frequency: form.frequency,
                deliveryAddress: {
                    address: form.address,
                    city: form.city,
                    state: form.state,
                },
                deliveryZone: "Lagos",
                paymentMethod: form.paymentMethod,
            }),
        });

        if (res.ok) setSuccess(true);
        setSubmitting(false);
    };

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const canProceedStep1 = items.length > 0;
    const canProceedStep2 = form.customerName && form.customerEmail;
    const canProceedStep3 = form.address && form.city && form.state;

    const filteredProducts = products.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (success) {
        return (
            <div className="min-h-screen bg-warm-cream flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl p-10 shadow-lg max-w-lg w-full text-center border border-warm-tan/20 animate-scaleIn">
                    {/* Success animation */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 bg-brand-green/10 rounded-full animate-ping" />
                        <div className="relative w-24 h-24 bg-brand-green/10 rounded-full flex items-center justify-center">
                            <Check size={40} className="text-brand-green" strokeWidth={2.5} />
                        </div>
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-brand-black mb-3">
                        Subscription Confirmed!
                    </h2>
                    <p className="text-muted-brown mb-2 leading-relaxed">
                        Your <span className="font-semibold text-brand-black">{
                            form.frequency === "weekly" ? "weekly" : form.frequency === "biweekly" ? "bi-weekly" : "monthly"
                        }</span> meat box is all set up.
                    </p>
                    <p className="text-sm text-muted-brown/70 mb-8">
                        We&apos;ll send you a confirmation email with all the details shortly.
                    </p>

                    <div className="bg-warm-cream/50 rounded-xl p-4 mb-8 border border-warm-tan/10">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-brown">Items per delivery</span>
                            <span className="font-semibold text-brand-black">{items.length} products</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-muted-brown">Estimated per delivery</span>
                            <span className="font-bold text-brand-red text-lg">&#8358;{subtotal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 bg-brand-red text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-red/90 transition-colors"
                        >
                            Back to Home
                        </Link>
                        <Link
                            href="/shop"
                            className="inline-flex items-center justify-center gap-2 border border-warm-tan/30 text-brand-black px-6 py-3 rounded-xl font-semibold hover:bg-warm-cream transition-colors"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-warm-cream flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-red mx-auto mb-4" />
                    <p className="text-muted-brown text-sm">Loading products...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-warm-cream">
            {/* Hero Header */}
            <div className="bg-brand-black text-white">
                <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-xs text-warm-tan uppercase tracking-widest mb-6">
                        <RefreshCw size={12} />
                        Subscribe & Save
                    </div>
                    <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                        Your Recurring Meat Box
                    </h1>
                    <p className="text-white/60 max-w-xl mx-auto text-lg leading-relaxed">
                        Choose your favourite cuts, set your delivery schedule, and never run out of premium meat again.
                    </p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="bg-white border-b border-warm-tan/10 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-center gap-2 md:gap-4">
                        {[
                            { num: 1, label: "Select Products", icon: ShoppingBag },
                            { num: 2, label: "Your Details", icon: User },
                            { num: 3, label: "Delivery", icon: MapPin },
                            { num: 4, label: "Confirm", icon: Check },
                        ].map((s, idx) => (
                            <div key={s.num} className="flex items-center gap-2 md:gap-4">
                                {idx > 0 && (
                                    <div
                                        className={`hidden sm:block w-8 md:w-12 h-[2px] ${
                                            step > idx ? "bg-brand-red" : "bg-warm-tan/20"
                                        } transition-colors`}
                                    />
                                )}
                                <button
                                    onClick={() => {
                                        if (s.num <= step) setStep(s.num);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        step === s.num
                                            ? "bg-brand-red text-white"
                                            : step > s.num
                                              ? "bg-brand-green/10 text-brand-green"
                                              : "bg-warm-cream text-muted-brown"
                                    }`}
                                >
                                    {step > s.num ? (
                                        <Check size={14} />
                                    ) : (
                                        <s.icon size={14} />
                                    )}
                                    <span className="hidden sm:inline">{s.label}</span>
                                    <span className="sm:hidden">{s.num}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column — Steps */}
                        <div className="lg:col-span-2">
                            {/* ── Step 1: Product Selection ── */}
                            {step === 1 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <h2 className="font-serif text-2xl font-bold text-brand-black mb-1">
                                            Choose Your Cuts
                                        </h2>
                                        <p className="text-muted-brown text-sm">
                                            Select the products you&apos;d like in every delivery.
                                        </p>
                                    </div>

                                    {/* Frequency Selector */}
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-3">
                                            Delivery Frequency
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {FREQUENCY_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setForm((p) => ({ ...p, frequency: opt.value }))}
                                                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                                                        form.frequency === opt.value
                                                            ? "border-brand-red bg-brand-red/5"
                                                            : "border-warm-tan/20 hover:border-warm-tan/40 bg-white"
                                                    }`}
                                                >
                                                    {opt.savings && (
                                                        <span className="absolute -top-2 right-3 px-2 py-0.5 bg-brand-red text-white text-[10px] font-bold rounded-full uppercase">
                                                            {opt.savings}
                                                        </span>
                                                    )}
                                                    <p className="font-semibold text-brand-black text-sm">{opt.label}</p>
                                                    <p className="text-xs text-muted-brown mt-0.5">{opt.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Search */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search products..."
                                            className="w-full bg-white border border-warm-tan/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40 pl-10"
                                        />
                                        <Package size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-brown/40" />
                                    </div>

                                    {/* Product Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
                                        {filteredProducts.map((product) => {
                                            const isSelected = items.some((i) => i.productId === product.id);
                                            return (
                                                <button
                                                    key={product.id}
                                                    type="button"
                                                    onClick={() => addItem(product)}
                                                    disabled={isSelected}
                                                    className={`group relative text-left p-4 rounded-xl border-2 transition-all ${
                                                        isSelected
                                                            ? "border-brand-green bg-brand-green/5 cursor-default"
                                                            : "border-transparent bg-white hover:border-brand-red/30 hover:shadow-sm"
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                                                            <Check size={12} className="text-white" />
                                                        </div>
                                                    )}
                                                    {product.images?.[0] && (
                                                        <div className="w-full aspect-square rounded-lg bg-warm-cream mb-3 overflow-hidden">
                                                            <img
                                                                src={product.images[0]}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                        </div>
                                                    )}
                                                    <p className="text-sm font-medium text-brand-black truncate">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-brand-red font-bold mt-0.5">
                                                        &#8358;{product.price.toLocaleString()}
                                                    </p>
                                                    {product.storageType && (
                                                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${
                                                            product.storageType === "frozen"
                                                                ? "bg-frozen-ice text-blue-600"
                                                                : product.storageType === "chilled"
                                                                  ? "bg-chilled-blue text-blue-500"
                                                                  : "bg-fresh-green text-green-600"
                                                        }`}>
                                                            {product.storageType}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={!canProceedStep1}
                                        onClick={() => setStep(2)}
                                        className="w-full flex items-center justify-center gap-2 bg-brand-red text-white py-3.5 rounded-xl font-semibold hover:bg-brand-red/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Continue
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            )}

                            {/* ── Step 2: Contact Details ── */}
                            {step === 2 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <h2 className="font-serif text-2xl font-bold text-brand-black mb-1">
                                            Your Details
                                        </h2>
                                        <p className="text-muted-brown text-sm">
                                            Tell us how to reach you about your subscription.
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 border border-warm-tan/20 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-2">
                                                    Full Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.customerName}
                                                    onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                                                    required
                                                    placeholder="e.g. Amara Obi"
                                                    className="w-full border border-warm-tan/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-2">
                                                    Email Address *
                                                </label>
                                                <input
                                                    type="email"
                                                    value={form.customerEmail}
                                                    onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))}
                                                    required
                                                    placeholder="amara@email.com"
                                                    className="w-full border border-warm-tan/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-2">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                                                placeholder="+234 xxx xxxx xxx"
                                                className="w-full border border-warm-tan/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="px-6 py-3 rounded-xl border border-warm-tan/30 text-brand-black font-semibold hover:bg-warm-cream transition-colors text-sm"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canProceedStep2}
                                            onClick={() => setStep(3)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white py-3 rounded-xl font-semibold hover:bg-brand-red/90 transition-colors disabled:opacity-40"
                                        >
                                            Continue
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 3: Delivery ── */}
                            {step === 3 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <h2 className="font-serif text-2xl font-bold text-brand-black mb-1">
                                            Delivery Address
                                        </h2>
                                        <p className="text-muted-brown text-sm">
                                            Where should we deliver your meat box?
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 border border-warm-tan/20 space-y-5">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-2">
                                                Street Address *
                                            </label>
                                            <input
                                                type="text"
                                                value={form.address}
                                                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                                                required
                                                placeholder="e.g. 12 Ozumba Mbadiwe Ave"
                                                className="w-full border border-warm-tan/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-2">
                                                    City *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.city}
                                                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                                                    required
                                                    placeholder="Lagos"
                                                    className="w-full border border-warm-tan/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-2">
                                                    State *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.state}
                                                    onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                                                    required
                                                    placeholder="Lagos"
                                                    className="w-full border border-warm-tan/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="bg-white rounded-xl p-6 border border-warm-tan/20">
                                        <label className="block text-xs font-semibold text-muted-brown uppercase tracking-wider mb-3">
                                            Payment Method
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setForm((p) => ({ ...p, paymentMethod: "bank_transfer" }))}
                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                                    form.paymentMethod === "bank_transfer"
                                                        ? "border-brand-red bg-brand-red/5"
                                                        : "border-warm-tan/20 hover:border-warm-tan/40"
                                                }`}
                                            >
                                                <CreditCard size={20} className={form.paymentMethod === "bank_transfer" ? "text-brand-red" : "text-muted-brown"} />
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-brand-black">Bank Transfer</p>
                                                    <p className="text-xs text-muted-brown">Pay via bank</p>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm((p) => ({ ...p, paymentMethod: "whatsapp" }))}
                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                                    form.paymentMethod === "whatsapp"
                                                        ? "border-brand-red bg-brand-red/5"
                                                        : "border-warm-tan/20 hover:border-warm-tan/40"
                                                }`}
                                            >
                                                <svg viewBox="0 0 24 24" className={`w-5 h-5 ${form.paymentMethod === "whatsapp" ? "text-brand-red" : "text-muted-brown"}`} fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                                </svg>
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-brand-black">WhatsApp</p>
                                                    <p className="text-xs text-muted-brown">Pay via chat</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="px-6 py-3 rounded-xl border border-warm-tan/30 text-brand-black font-semibold hover:bg-warm-cream transition-colors text-sm"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canProceedStep3}
                                            onClick={() => setStep(4)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white py-3 rounded-xl font-semibold hover:bg-brand-red/90 transition-colors disabled:opacity-40"
                                        >
                                            Review Order
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 4: Confirm ── */}
                            {step === 4 && (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <h2 className="font-serif text-2xl font-bold text-brand-black mb-1">
                                            Review & Confirm
                                        </h2>
                                        <p className="text-muted-brown text-sm">
                                            Double-check everything before starting your subscription.
                                        </p>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="space-y-4">
                                        {/* Customer Info */}
                                        <div className="bg-white rounded-xl p-5 border border-warm-tan/20">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-xs font-semibold text-muted-brown uppercase tracking-wider">
                                                    Contact Info
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(2)}
                                                    className="text-xs text-brand-red hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                            <p className="text-sm text-brand-black font-medium">{form.customerName}</p>
                                            <p className="text-sm text-muted-brown">{form.customerEmail}</p>
                                            {form.phone && <p className="text-sm text-muted-brown">{form.phone}</p>}
                                        </div>

                                        {/* Delivery */}
                                        <div className="bg-white rounded-xl p-5 border border-warm-tan/20">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-xs font-semibold text-muted-brown uppercase tracking-wider">
                                                    Delivery
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(3)}
                                                    className="text-xs text-brand-red hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                            <p className="text-sm text-brand-black">{form.address}</p>
                                            <p className="text-sm text-muted-brown">
                                                {form.city}, {form.state}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="text-muted-brown">
                                                    <Calendar size={14} className="inline mr-1" />
                                                    {form.frequency === "weekly" ? "Weekly" : form.frequency === "biweekly" ? "Bi-weekly" : "Monthly"}
                                                </span>
                                                <span className="text-muted-brown">
                                                    <CreditCard size={14} className="inline mr-1" />
                                                    {form.paymentMethod === "bank_transfer" ? "Bank Transfer" : "WhatsApp"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Products */}
                                        <div className="bg-white rounded-xl p-5 border border-warm-tan/20">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-xs font-semibold text-muted-brown uppercase tracking-wider">
                                                    Products ({items.length})
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    className="text-xs text-brand-red hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {items.map((item) => (
                                                    <div key={item.productId} className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-brand-black">{item.productName}</p>
                                                            <p className="text-xs text-muted-brown">
                                                                &#8358;{item.price.toLocaleString()} x {item.quantity}
                                                            </p>
                                                        </div>
                                                        <span className="text-sm font-semibold text-brand-black">
                                                            &#8358;{(item.price * item.quantity).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(3)}
                                            className="px-6 py-3 rounded-xl border border-warm-tan/30 text-brand-black font-semibold hover:bg-warm-cream transition-colors text-sm"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white py-3.5 rounded-xl font-bold hover:bg-brand-red/90 transition-colors disabled:opacity-50 text-base"
                                        >
                                            {submitting ? (
                                                <>
                                                    <RefreshCw size={18} className="animate-spin" />
                                                    Setting up...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={18} />
                                                    Start Subscription
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column — Live Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl p-6 border border-warm-tan/20 shadow-sm sticky top-20">
                                <h3 className="text-xs font-semibold text-muted-brown uppercase tracking-wider mb-4">
                                    Your Recurring Box
                                </h3>

                                {items.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Package size={32} className="mx-auto text-muted-brown/20 mb-3" />
                                        <p className="text-sm text-muted-brown">
                                            Select products to build your box.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                                        {items.map((item) => (
                                            <div key={item.productId} className="flex items-center gap-3 group">
                                                {item.image && (
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-warm-cream shrink-0">
                                                        <img
                                                            src={item.image}
                                                            alt={item.productName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-brand-black truncate">
                                                        {item.productName}
                                                    </p>
                                                    <p className="text-xs text-muted-brown">
                                                        &#8358;{item.price.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                                                        className="w-6 h-6 rounded-md bg-warm-cream text-brand-black flex items-center justify-center hover:bg-warm-tan/20 transition-colors"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="text-sm w-5 text-center font-medium">{item.quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                                                        className="w-6 h-6 rounded-md bg-warm-cream text-brand-black flex items-center justify-center hover:bg-warm-tan/20 transition-colors"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.productId)}
                                                        className="ml-1 p-1 rounded text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {items.length > 0 && (
                                    <>
                                        <div className="border-t border-warm-tan/10 pt-4 space-y-2">
                                            <div className="flex justify-between text-sm text-muted-brown">
                                                <span>Delivery frequency</span>
                                                <span className="font-medium text-brand-black capitalize">{form.frequency}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-muted-brown">
                                                <span>Items</span>
                                                <span className="font-medium text-brand-black">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-warm-tan/10 mt-4 pt-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-brand-black">Per Delivery</span>
                                                <span className="text-xl font-bold text-brand-red">&#8358;{subtotal.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-brown/70 mt-1">
                                                + delivery fee calculated at dispatch
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
