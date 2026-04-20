"use client";

import { useState, useEffect, useMemo } from "react";
import type { BundleRule, Product, PrepOption } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { useCartStore } from "@/lib/cartStore";
import { StorageBadge } from "@/components/ui/StorageBadge";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Check, ShoppingCart, Minus, Plus, Search, X, ChevronRight, Sparkles } from "lucide-react";
import { getText } from "@/lib/textDefaults";

export default function BundlesPage() {
    const [bundles, setBundles] = useState<BundleRule[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedBundle, setSelectedBundle] = useState<BundleRule | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [addedToCart, setAddedToCart] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStorage, setFilterStorage] = useState<string>("all");
    // Track prep option selections per product: productId -> PrepOption[]
    const [productPrepSelections, setProductPrepSelections] = useState<Map<string, PrepOption[]>>(new Map());
    const [customTexts, setCustomTexts] = useState<Record<string, string>>();
    const addBundleToCart = useCartStore((s) => s.addBundleToCart);

    useEffect(() => {
        Promise.all([
            fetch("/api/bundles").then((r) => r.json()),
            fetch("/api/products").then((r) => r.json()).catch(() => []),
            fetch("/api/settings").then((r) => r.json()).catch(() => null),
        ]).then(([bundleData, productData, settingsData]) => {
            setBundles(bundleData);
            setProducts(productData);
            if (settingsData?.customTexts) setCustomTexts(settingsData.customTexts);
            setLoading(false);
        });
    }, []);

    const filteredProducts = useMemo(() => {
        if (!selectedBundle) return [];
        let list = selectedBundle.allowedCategoryIds?.length
            ? products.filter((p) => p.categoryId && selectedBundle.allowedCategoryIds!.includes(p.categoryId))
            : products;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
        }
        if (filterStorage !== "all") {
            list = list.filter((p) => p.storageType === filterStorage);
        }
        return list;
    }, [selectedBundle, products, searchQuery, filterStorage]);

    const totalItemCount = useMemo(() => {
        let count = 0;
        for (const qty of selectedProducts.values()) count += qty;
        return count;
    }, [selectedProducts]);

    const getQty = (id: string) => selectedProducts.get(id) || 0;

    const setQty = (product: Product, qty: number) => {
        setSelectedProducts((prev) => {
            const next = new Map(prev);
            if (qty <= 0) {
                next.delete(product.id);
            } else if (selectedBundle) {
                const currentCount = totalItemCount - (prev.get(product.id) || 0);
                const maxAllowed = selectedBundle.maxItems - currentCount;
                next.set(product.id, Math.min(qty, maxAllowed));
            }
            return next;
        });
    };

    const togglePrepOption = (productId: string, option: PrepOption) => {
        setProductPrepSelections((prev) => {
            const next = new Map(prev);
            const current = next.get(productId) || [];
            const exists = current.some((o) => o.id === option.id);
            next.set(productId, exists ? current.filter((o) => o.id !== option.id) : [...current, option]);
            return next;
        });
    };

    const getPrepSelections = (productId: string): PrepOption[] => productPrepSelections.get(productId) || [];

    const totalPrepFee = useMemo(() => {
        let fee = 0;
        for (const [id, qty] of selectedProducts.entries()) {
            const preps = productPrepSelections.get(id) || [];
            fee += preps.reduce((sum, o) => sum + o.extraFee, 0) * qty;
        }
        return fee;
    }, [selectedProducts, productPrepSelections]);

    const canAddToCart = selectedBundle && totalItemCount >= selectedBundle.minItems && totalItemCount <= selectedBundle.maxItems;

    const handleAddBundleToCart = () => {
        if (!canAddToCart || !selectedBundle) return;
        const entries = Array.from(selectedProducts.entries()).map(([productId, quantity]) => ({
            productId,
            quantity,
            prepOptions: getPrepSelections(productId),
        }));
        addBundleToCart(products, entries, selectedBundle.discountPercent, selectedBundle.name);
        setAddedToCart(true);
        setTimeout(() => {
            setAddedToCart(false);
            setSelectedProducts(new Map());
            setProductPrepSelections(new Map());
            setSelectedBundle(null);
        }, 2000);
    };

    const bundleSubtotal = useMemo(() => {
        let sum = 0;
        for (const [id, qty] of selectedProducts.entries()) {
            const p = products.find((pr) => pr.id === id);
            if (p) sum += p.price * qty;
        }
        return sum;
    }, [selectedProducts, products]);

    const discountAmount = selectedBundle ? bundleSubtotal * (selectedBundle.discountPercent / 100) : 0;
    const finalTotal = bundleSubtotal - discountAmount;

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-red/20 border-t-brand-red" />
                    <p className="text-warm-cream/40 text-sm">Loading bundles...</p>
                </div>
            </div>
        );
    }

    // Success overlay
    if (addedToCart) {
        return (
            <div className="min-h-screen bg-brand-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl p-10 shadow-2xl text-center max-w-sm mx-auto border border-warm-cream/[0.06] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-green/5 via-transparent to-transparent" />
                    <div className="relative w-16 h-16 rounded-full bg-brand-green/15 flex items-center justify-center mx-auto mb-4 border border-brand-green/20">
                        <Check className="w-8 h-8 text-brand-green" />
                    </div>
                    <h2 className="relative font-serif text-2xl font-bold text-warm-cream mb-2">Bundle Added!</h2>
                    <p className="relative text-warm-cream/40 text-sm">Your bundle has been added to cart with the discount applied.</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-black">
            {/* Hero header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-green via-brand-green/90 to-brand-black text-warm-cream">
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(253,246,236,0.5) 0.5px, transparent 0)", backgroundSize: "24px 24px" }} />
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-warm-cream/5 rounded-full blur-[100px] translate-y-1/2" />
                <div className="max-w-7xl mx-auto px-4 pt-10 pb-14 relative z-10">
                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 text-warm-cream/60 hover:text-warm-cream text-sm mb-6 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Shop
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3 tracking-tight">{getText(customTexts, "bundles.heading")}</h1>
                            <p className="text-warm-cream/60 text-lg max-w-lg">
                                {getText(customTexts, "bundles.desc")}
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                            <div className="w-10 h-10 rounded-lg bg-brand-red/15 flex items-center justify-center">
                                <Package className="text-brand-red" size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{bundles.length} Bundle{bundles.length !== 1 ? "s" : ""}</p>
                                <p className="text-xs text-warm-cream/50">Available now</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-10">
                <AnimatePresence mode="wait">
                    {!selectedBundle ? (
                        /* ── Bundle Selection ── */
                        <motion.div
                            key="bundles-list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* How it works */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
                                {[
                                    { step: "1", title: "Choose a Bundle", desc: "Pick the bundle size that fits your needs." },
                                    { step: "2", title: "Select Your Cuts", desc: "Mix and match from our premium meat selection." },
                                    { step: "3", title: "Save & Checkout", desc: "Get your bundle discount applied automatically." },
                                ].map((item, i) => (
                                    <div key={item.step} className="relative group flex items-start gap-4 bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl p-6 border border-warm-cream/[0.06] hover:border-brand-green/20 transition-all duration-500 hover:shadow-[0_4px_24px_rgba(53,94,59,0.1)]">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <span className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center font-bold text-sm border border-brand-green/20">
                                            {item.step}
                                        </span>
                                        <div className="relative">
                                            <h3 className="font-semibold text-warm-cream text-sm mb-1">{item.title}</h3>
                                            <p className="text-warm-cream/40 text-xs leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {bundles.length === 0 ? (
                                <div className="text-center py-20">
                                    <Package className="mx-auto text-warm-cream/40/30 mb-4" size={48} />
                                    <p className="text-warm-cream/40 text-lg">No bundles available yet.</p>
                                    <p className="text-warm-cream/40/60 text-sm mt-1">Check back soon for great deals!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {bundles.map((bundle, i) => (
                                        <motion.button
                                            key={bundle.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            onClick={() => {
                                                setSelectedBundle(bundle);
                                                setSelectedProducts(new Map());
                                                setProductPrepSelections(new Map());
                                                setSearchQuery("");
                                                setFilterStorage("all");
                                            }}
                                            className="group relative bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl p-6 text-left border border-warm-cream/[0.06] hover:border-brand-green/25 transition-all duration-500 hover:shadow-[0_8px_40px_rgba(53,94,59,0.15)] overflow-hidden cursor-pointer"
                                        >
                                            {/* Ambient glow */}
                                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-green/8 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-brand-red/6 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                            {/* Discount badge */}
                                            <div className="absolute top-4 right-4">
                                                <span className="inline-flex items-center gap-1.5 bg-brand-red text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-brand-red/20">
                                                    <Sparkles size={12} />
                                                    {bundle.discountPercent}% OFF
                                                </span>
                                            </div>

                                            <div className="relative w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center mb-4 group-hover:bg-brand-green/20 transition-colors duration-300 border border-brand-green/15">
                                                <Package className="text-brand-green" size={22} />
                                            </div>

                                            <h3 className="relative font-serif text-xl font-bold text-warm-cream mb-2 pr-20 group-hover:text-brand-green transition-colors duration-300">{bundle.name}</h3>
                                            {bundle.description && (
                                                <p className="relative text-warm-cream/40 text-sm mb-5 leading-relaxed">{bundle.description}</p>
                                            )}

                                            <div className="relative flex items-center justify-between pt-4 border-t border-warm-cream/[0.06]">
                                                <span className="text-warm-cream/35 text-sm">
                                                    {bundle.minItems}–{bundle.maxItems} items
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-brand-green text-sm font-semibold group-hover:gap-2 transition-all duration-300">
                                                    Build this box <ChevronRight size={14} />
                                                </span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* ── Product Selection ── */
                        <motion.div
                            key="product-selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Top bar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <button
                                        onClick={() => {
                                            setSelectedBundle(null);
                                            setSelectedProducts(new Map());
                                            setProductPrepSelections(new Map());
                                        }}
                                        className="inline-flex items-center gap-2 text-brand-red text-sm mb-2 hover:underline"
                                    >
                                        <ArrowLeft size={14} /> All bundles
                                    </button>
                                    <h2 className="font-serif text-2xl md:text-3xl font-bold text-warm-cream">{selectedBundle.name}</h2>
                                    {selectedBundle.description && (
                                        <p className="text-warm-cream/40 text-sm mt-1">{selectedBundle.description}</p>
                                    )}
                                </div>

                                {/* Progress indicator */}
                                <div className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl px-5 py-4 border border-warm-cream/[0.06] shadow-lg shadow-black/20">
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] text-warm-cream/35 uppercase tracking-wider font-medium">Items selected</p>
                                            <p className="text-lg font-bold text-warm-cream">
                                                {totalItemCount}
                                                <span className="text-warm-cream/30 font-normal text-sm"> / {selectedBundle.minItems}–{selectedBundle.maxItems}</span>
                                            </p>
                                        </div>
                                        <div className="w-28 h-2.5 bg-warm-cream/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    totalItemCount >= selectedBundle.minItems ? "bg-brand-green shadow-[0_0_8px_rgba(53,94,59,0.5)]" : "bg-brand-red"
                                                }`}
                                                style={{ width: `${Math.min(100, (totalItemCount / selectedBundle.minItems) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    {totalItemCount >= selectedBundle.minItems && (
                                        <p className="text-brand-green text-xs font-semibold mt-2 flex items-center gap-1">
                                            <Check size={12} /> {selectedBundle.discountPercent}% discount active
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Search & filters */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-cream/25" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-warm-cream/[0.08] bg-[#1e1e1e] text-sm text-warm-cream placeholder:text-warm-cream/25 focus:outline-none focus:border-brand-green/30 focus:ring-2 focus:ring-brand-green/10 transition-all"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-cream/30 hover:text-brand-red cursor-pointer">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {["all", "fresh", "chilled", "frozen"].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setFilterStorage(s)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all duration-300 cursor-pointer ${
                                                filterStorage === s
                                                    ? "bg-brand-green text-white shadow-md shadow-brand-green/20"
                                                    : "bg-[#1e1e1e] text-warm-cream/50 border border-warm-cream/[0.08] hover:border-brand-green/20 hover:text-warm-cream/70"
                                            }`}
                                        >
                                            {s === "all" ? "All Types" : s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Products grid + summary sidebar */}
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Products */}
                                <div className="flex-1">
                                    {filteredProducts.length === 0 ? (
                                        <div className="text-center py-16 bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl border border-warm-cream/[0.06]">
                                            <Search className="mx-auto text-warm-cream/15 mb-3" size={36} />
                                            <p className="text-warm-cream/50">No products found.</p>
                                            <p className="text-warm-cream/25 text-sm mt-1">Try adjusting your search or filters.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {filteredProducts.map((product) => {
                                                const qty = getQty(product.id);
                                                const isSelected = qty > 0;
                                                const atMax = totalItemCount >= selectedBundle.maxItems && !isSelected;
                                                return (
                                                    <motion.div
                                                        key={product.id}
                                                        layout
                                                        className={`group/card bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-2xl overflow-hidden transition-all duration-400 ${
                                                            isSelected
                                                                ? "border-2 border-brand-green shadow-[0_4px_24px_rgba(53,94,59,0.2)] ring-1 ring-brand-green/20"
                                                                : atMax
                                                                  ? "border border-warm-cream/[0.04] opacity-40 cursor-not-allowed"
                                                                  : "border border-warm-cream/[0.06] hover:border-brand-green/20 hover:shadow-[0_4px_20px_rgba(53,94,59,0.1)]"
                                                        }`}
                                                    >
                                                        <div className="relative aspect-[4/3] bg-[#2a2a2a]">
                                                            {product.images?.[0] ? (
                                                                <Image
                                                                    src={product.images[0]}
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 768px) 50vw, 33vw"
                                                                />
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center text-warm-cream/40/20">
                                                                    <Package size={32} />
                                                                </div>
                                                            )}
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-green flex items-center justify-center shadow-lg shadow-brand-green/30">
                                                                    <Check className="text-white" size={14} />
                                                                </div>
                                                            )}
                                                            {product.storageType && (
                                                                <div className="absolute top-2 left-2">
                                                                    <StorageBadge type={product.storageType} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-4">
                                                            <h4 className="font-semibold text-warm-cream text-sm mb-1 line-clamp-1">{product.name}</h4>
                                                            {product.cutType && (
                                                                <p className="text-warm-cream/40/60 text-xs mb-1">{product.cutType}</p>
                                                            )}
                                                            <p className="text-brand-red font-bold text-sm mb-3">
                                                                &#8358;{product.price.toLocaleString()}
                                                                {product.priceUnit && (
                                                                    <span className="text-warm-cream/40/50 font-normal text-xs ml-1">
                                                                        /{product.priceUnit.replace("per_", "")}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            {/* Qty controls */}
                                                            <div className="flex items-center gap-2">
                                                                {isSelected ? (
                                                                    <div className="flex items-center gap-1 w-full">
                                                                        <button
                                                                            onClick={() => setQty(product, qty - 1)}
                                                                            className="w-8 h-8 rounded-lg bg-warm-cream/5 hover:bg-warm-cream/10 flex items-center justify-center transition-colors text-warm-cream/60 cursor-pointer"
                                                                        >
                                                                            <Minus size={14} />
                                                                        </button>
                                                                        <span className="flex-1 text-center font-bold text-sm text-warm-cream">{qty}</span>
                                                                        <button
                                                                            onClick={() => setQty(product, qty + 1)}
                                                                            disabled={totalItemCount >= selectedBundle.maxItems}
                                                                            className="w-8 h-8 rounded-lg bg-warm-cream/5 hover:bg-warm-cream/10 flex items-center justify-center transition-colors text-warm-cream/60 disabled:opacity-30 cursor-pointer"
                                                                        >
                                                                            <Plus size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => !atMax && setQty(product, 1)}
                                                                        disabled={atMax}
                                                                        className="w-full py-2 rounded-lg text-xs font-semibold border border-brand-green/20 text-brand-green hover:bg-brand-green/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                                                    >
                                                                        + Add to Box
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {/* Prep options */}
                                                            {isSelected && product.prepOptions && product.prepOptions.length > 0 && (
                                                                <div className="mt-3 pt-3 border-t border-warm-cream/10 space-y-1.5">
                                                                    <p className="text-[10px] font-semibold text-warm-cream/40/60 uppercase tracking-wider">Prep Options</p>
                                                                    {product.prepOptions.map((opt) => {
                                                                        const isChecked = getPrepSelections(product.id).some((s) => s.id === opt.id);
                                                                        return (
                                                                            <label
                                                                                key={opt.id}
                                                                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${
                                                                                    isChecked
                                                                                        ? "border-brand-red/30 bg-brand-red/5"
                                                                                        : "border-warm-cream/15 hover:border-warm-cream/30"
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={() => togglePrepOption(product.id, opt)}
                                                                                        className="w-3.5 h-3.5 rounded border-warm-cream/30 text-brand-red focus:ring-brand-red/20"
                                                                                    />
                                                                                    <span className="text-warm-cream">{opt.label}</span>
                                                                                </div>
                                                                                <span className="text-warm-cream/40 font-medium">+{formatCurrency(opt.extraFee)}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Sticky summary sidebar */}
                                <div className="lg:w-80 flex-shrink-0">
                                    <div className="lg:sticky lg:top-24 bg-gradient-to-b from-[#1e1e1e] to-[#222] rounded-2xl overflow-hidden shadow-xl shadow-black/20 border border-warm-cream/[0.06]">
                                        <div className="bg-gradient-to-r from-brand-green/15 via-brand-green/5 to-transparent px-6 py-4 border-b border-warm-cream/[0.06]">
                                            <h3 className="font-serif text-lg font-bold text-warm-cream flex items-center gap-2">
                                                <ShoppingCart size={18} className="text-brand-green" /> Your Box
                                            </h3>
                                        </div>
                                        <div className="p-6">

                                        {selectedProducts.size === 0 ? (
                                            <div className="text-center py-8">
                                                <Package className="mx-auto text-warm-cream/15 mb-2" size={32} />
                                                <p className="text-warm-cream/30 text-sm">Your box is empty. Start adding items!</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                                                    {Array.from(selectedProducts.entries()).map(([id, qty]) => {
                                                        const p = products.find((pr) => pr.id === id);
                                                        if (!p) return null;
                                                        const preps = getPrepSelections(id);
                                                        const itemPrepFee = preps.reduce((s, o) => s + o.extraFee, 0) * qty;
                                                        return (
                                                            <div key={id}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-warm-tan/10 overflow-hidden flex-shrink-0 relative">
                                                                        {p.images?.[0] ? (
                                                                            <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="40px" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-warm-cream/40/20">
                                                                                <Package size={14} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-warm-cream truncate">{p.name}</p>
                                                                        <p className="text-xs text-warm-cream/40">x{qty} &middot; &#8358;{(p.price * qty).toLocaleString()}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setQty(p, 0)}
                                                                        className="text-warm-cream/40/30 hover:text-brand-red transition-colors"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                                {preps.length > 0 && (
                                                                    <div className="ml-13 mt-1 space-y-0.5">
                                                                        {preps.map((o) => (
                                                                            <p key={o.id} className="text-[10px] text-warm-cream/40/60 flex justify-between">
                                                                                <span>+ {o.label}</span>
                                                                                <span>{formatCurrency(o.extraFee)}</span>
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="border-t border-warm-cream/[0.06] pt-4 space-y-2 text-sm">
                                                    <div className="flex justify-between text-warm-cream/40">
                                                        <span>Subtotal ({totalItemCount} item{totalItemCount !== 1 ? "s" : ""})</span>
                                                        <span>&#8358;{bundleSubtotal.toLocaleString()}</span>
                                                    </div>
                                                    {totalItemCount >= selectedBundle.minItems && (
                                                        <div className="flex justify-between text-brand-green font-semibold">
                                                            <span>Discount ({selectedBundle.discountPercent}%)</span>
                                                            <span>-&#8358;{Math.round(discountAmount).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {totalPrepFee > 0 && (
                                                        <div className="flex justify-between text-warm-cream/40">
                                                            <span>Prep Fee</span>
                                                            <span>&#8358;{totalPrepFee.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-bold text-warm-cream text-base pt-2 border-t border-warm-cream/[0.06]">
                                                        <span>Total</span>
                                                        <span>&#8358;{Math.round(finalTotal + totalPrepFee).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {totalItemCount > 0 && totalItemCount < selectedBundle.minItems && (
                                            <p className="text-xs text-amber-500/80 mt-3">
                                                Add {selectedBundle.minItems - totalItemCount} more item{selectedBundle.minItems - totalItemCount !== 1 ? "s" : ""} to unlock the {selectedBundle.discountPercent}% discount.
                                            </p>
                                        )}

                                        <button
                                            onClick={handleAddBundleToCart}
                                            disabled={!canAddToCart}
                                            className="w-full mt-5 bg-brand-green text-white py-3.5 rounded-xl font-semibold hover:bg-brand-green/90 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 cursor-pointer active:scale-[0.98]"
                                        >
                                            <ShoppingCart size={16} />
                                            Add Bundle to Cart
                                        </button>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
