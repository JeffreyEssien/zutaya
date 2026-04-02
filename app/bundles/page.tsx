"use client";

import { useState, useEffect, useMemo } from "react";
import type { BundleRule, Product } from "@/types";
import { useCartStore } from "@/lib/cartStore";
import { StorageBadge } from "@/components/ui/StorageBadge";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Check, ShoppingCart, Minus, Plus, Search, X, ChevronRight, Sparkles } from "lucide-react";

export default function BundlesPage() {
    const [bundles, setBundles] = useState<BundleRule[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedBundle, setSelectedBundle] = useState<BundleRule | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [addedToCart, setAddedToCart] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStorage, setFilterStorage] = useState<string>("all");
    const addItem = useCartStore((s) => s.addItem);

    useEffect(() => {
        Promise.all([
            fetch("/api/bundles").then((r) => r.json()),
            fetch("/api/products").then((r) => r.json()).catch(() => []),
        ]).then(([bundleData, productData]) => {
            setBundles(bundleData);
            setProducts(productData);
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

    const canAddToCart = selectedBundle && totalItemCount >= selectedBundle.minItems && totalItemCount <= selectedBundle.maxItems;

    const handleAddBundleToCart = () => {
        if (!canAddToCart) return;
        for (const [productId, qty] of selectedProducts.entries()) {
            const product = products.find((p) => p.id === productId);
            if (product) {
                for (let i = 0; i < qty; i++) addItem(product);
            }
        }
        setAddedToCart(true);
        setTimeout(() => {
            setAddedToCart(false);
            setSelectedProducts(new Map());
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
            <div className="min-h-screen bg-warm-cream flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-red/20 border-t-brand-red" />
                    <p className="text-muted-brown text-sm">Loading bundles...</p>
                </div>
            </div>
        );
    }

    // Success overlay
    if (addedToCart) {
        return (
            <div className="min-h-screen bg-warm-cream flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl p-10 shadow-xl text-center max-w-sm mx-auto"
                >
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-brand-black mb-2">Bundle Added!</h2>
                    <p className="text-muted-brown text-sm">Your bundle has been added to cart with the discount applied.</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-warm-cream">
            {/* Hero header */}
            <div className="bg-deep-espresso text-warm-cream">
                <div className="max-w-7xl mx-auto px-4 pt-8 pb-12">
                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 text-warm-cream/60 hover:text-warm-cream text-sm mb-6 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Shop
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">Build Your Box</h1>
                            <p className="text-warm-cream/60 text-lg max-w-lg">
                                Pick a bundle, choose your cuts, and save big. Mix and match your favourite premium meats.
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 bg-warm-cream/10 rounded-xl px-5 py-3">
                            <Package className="text-brand-red" size={24} />
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                                {[
                                    { step: "1", title: "Choose a Bundle", desc: "Pick the bundle size that fits your needs." },
                                    { step: "2", title: "Select Your Cuts", desc: "Mix and match from our premium meat selection." },
                                    { step: "3", title: "Save & Checkout", desc: "Get your bundle discount applied automatically." },
                                ].map((item) => (
                                    <div key={item.step} className="flex items-start gap-4 bg-white rounded-xl p-5 border border-warm-tan/15">
                                        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center font-bold text-sm">
                                            {item.step}
                                        </span>
                                        <div>
                                            <h3 className="font-semibold text-brand-black text-sm mb-0.5">{item.title}</h3>
                                            <p className="text-muted-brown text-xs leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {bundles.length === 0 ? (
                                <div className="text-center py-20">
                                    <Package className="mx-auto text-muted-brown/30 mb-4" size={48} />
                                    <p className="text-muted-brown text-lg">No bundles available yet.</p>
                                    <p className="text-muted-brown/60 text-sm mt-1">Check back soon for great deals!</p>
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
                                                setSearchQuery("");
                                                setFilterStorage("all");
                                            }}
                                            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-left border border-warm-tan/15 hover:border-brand-red/30 relative overflow-hidden"
                                        >
                                            {/* Discount badge */}
                                            <div className="absolute top-4 right-4">
                                                <span className="inline-flex items-center gap-1 bg-brand-red text-white px-3 py-1.5 rounded-full text-xs font-bold">
                                                    <Sparkles size={12} />
                                                    {bundle.discountPercent}% OFF
                                                </span>
                                            </div>

                                            <div className="w-12 h-12 rounded-xl bg-brand-red/8 flex items-center justify-center mb-4 group-hover:bg-brand-red/15 transition-colors">
                                                <Package className="text-brand-red" size={22} />
                                            </div>

                                            <h3 className="font-serif text-xl font-bold text-brand-black mb-2 pr-20">{bundle.name}</h3>
                                            {bundle.description && (
                                                <p className="text-muted-brown text-sm mb-5 leading-relaxed">{bundle.description}</p>
                                            )}

                                            <div className="flex items-center justify-between pt-4 border-t border-warm-tan/10">
                                                <span className="text-muted-brown text-sm">
                                                    {bundle.minItems}–{bundle.maxItems} items
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-brand-red text-sm font-semibold group-hover:gap-2 transition-all">
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
                                        }}
                                        className="inline-flex items-center gap-2 text-brand-red text-sm mb-2 hover:underline"
                                    >
                                        <ArrowLeft size={14} /> All bundles
                                    </button>
                                    <h2 className="font-serif text-2xl md:text-3xl font-bold text-brand-black">{selectedBundle.name}</h2>
                                    {selectedBundle.description && (
                                        <p className="text-muted-brown text-sm mt-1">{selectedBundle.description}</p>
                                    )}
                                </div>

                                {/* Progress indicator */}
                                <div className="bg-white rounded-xl px-5 py-3 border border-warm-tan/15 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-brown">Items selected</p>
                                            <p className="text-lg font-bold text-brand-black">
                                                {totalItemCount}
                                                <span className="text-muted-brown font-normal text-sm"> / {selectedBundle.minItems}–{selectedBundle.maxItems}</span>
                                            </p>
                                        </div>
                                        <div className="w-24 h-2 bg-warm-tan/15 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    totalItemCount >= selectedBundle.minItems ? "bg-green-500" : "bg-brand-red"
                                                }`}
                                                style={{ width: `${Math.min(100, (totalItemCount / selectedBundle.minItems) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    {totalItemCount >= selectedBundle.minItems && (
                                        <p className="text-green-600 text-xs font-semibold mt-1 flex items-center gap-1">
                                            <Check size={12} /> {selectedBundle.discountPercent}% discount active
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Search & filters */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-brown/40" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-warm-tan/20 bg-white text-sm focus:outline-none focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10 transition-all"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-brown/40 hover:text-brand-red">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {["all", "fresh", "chilled", "frozen"].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setFilterStorage(s)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                                                filterStorage === s
                                                    ? "bg-brand-red text-white shadow-sm"
                                                    : "bg-white text-muted-brown border border-warm-tan/20 hover:border-brand-red/30"
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
                                        <div className="text-center py-16 bg-white rounded-2xl border border-warm-tan/10">
                                            <Search className="mx-auto text-muted-brown/30 mb-3" size={36} />
                                            <p className="text-muted-brown">No products found.</p>
                                            <p className="text-muted-brown/50 text-sm mt-1">Try adjusting your search or filters.</p>
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
                                                        className={`bg-white rounded-xl overflow-hidden border-2 transition-all ${
                                                            isSelected
                                                                ? "border-brand-red shadow-md ring-2 ring-brand-red/10"
                                                                : atMax
                                                                  ? "border-transparent opacity-50 cursor-not-allowed"
                                                                  : "border-transparent hover:border-warm-tan/30 hover:shadow-sm"
                                                        }`}
                                                    >
                                                        <div className="relative aspect-[4/3] bg-warm-tan/10">
                                                            {product.images?.[0] ? (
                                                                <Image
                                                                    src={product.images[0]}
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 768px) 50vw, 33vw"
                                                                />
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center text-muted-brown/20">
                                                                    <Package size={32} />
                                                                </div>
                                                            )}
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-red flex items-center justify-center">
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
                                                            <h4 className="font-semibold text-brand-black text-sm mb-1 line-clamp-1">{product.name}</h4>
                                                            {product.cutType && (
                                                                <p className="text-muted-brown/60 text-xs mb-1">{product.cutType}</p>
                                                            )}
                                                            <p className="text-brand-red font-bold text-sm mb-3">
                                                                &#8358;{product.price.toLocaleString()}
                                                                {product.priceUnit && (
                                                                    <span className="text-muted-brown/50 font-normal text-xs ml-1">
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
                                                                            className="w-8 h-8 rounded-lg bg-warm-tan/10 hover:bg-warm-tan/20 flex items-center justify-center transition-colors"
                                                                        >
                                                                            <Minus size={14} />
                                                                        </button>
                                                                        <span className="flex-1 text-center font-bold text-sm">{qty}</span>
                                                                        <button
                                                                            onClick={() => setQty(product, qty + 1)}
                                                                            disabled={totalItemCount >= selectedBundle.maxItems}
                                                                            className="w-8 h-8 rounded-lg bg-warm-tan/10 hover:bg-warm-tan/20 flex items-center justify-center transition-colors disabled:opacity-30"
                                                                        >
                                                                            <Plus size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => !atMax && setQty(product, 1)}
                                                                        disabled={atMax}
                                                                        className="w-full py-2 rounded-lg text-xs font-semibold border border-brand-red/20 text-brand-red hover:bg-brand-red/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        + Add to Box
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Sticky summary sidebar */}
                                <div className="lg:w-80 flex-shrink-0">
                                    <div className="lg:sticky lg:top-24 bg-white rounded-2xl p-6 shadow-sm border border-warm-tan/15">
                                        <h3 className="font-serif text-lg font-bold text-brand-black mb-4 flex items-center gap-2">
                                            <ShoppingCart size={18} /> Your Box
                                        </h3>

                                        {selectedProducts.size === 0 ? (
                                            <div className="text-center py-8">
                                                <Package className="mx-auto text-muted-brown/20 mb-2" size={32} />
                                                <p className="text-muted-brown/50 text-sm">Your box is empty. Start adding items!</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                                                    {Array.from(selectedProducts.entries()).map(([id, qty]) => {
                                                        const p = products.find((pr) => pr.id === id);
                                                        if (!p) return null;
                                                        return (
                                                            <div key={id} className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-warm-tan/10 overflow-hidden flex-shrink-0 relative">
                                                                    {p.images?.[0] ? (
                                                                        <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="40px" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-muted-brown/20">
                                                                            <Package size={14} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-brand-black truncate">{p.name}</p>
                                                                    <p className="text-xs text-muted-brown">x{qty} &middot; &#8358;{(p.price * qty).toLocaleString()}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => setQty(p, 0)}
                                                                    className="text-muted-brown/30 hover:text-brand-red transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="border-t border-warm-tan/10 pt-4 space-y-2 text-sm">
                                                    <div className="flex justify-between text-muted-brown">
                                                        <span>Subtotal ({totalItemCount} item{totalItemCount !== 1 ? "s" : ""})</span>
                                                        <span>&#8358;{bundleSubtotal.toLocaleString()}</span>
                                                    </div>
                                                    {totalItemCount >= selectedBundle.minItems && (
                                                        <div className="flex justify-between text-green-600 font-semibold">
                                                            <span>Discount ({selectedBundle.discountPercent}%)</span>
                                                            <span>-&#8358;{Math.round(discountAmount).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-bold text-brand-black text-base pt-2 border-t border-warm-tan/10">
                                                        <span>Total</span>
                                                        <span>&#8358;{Math.round(finalTotal).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {totalItemCount > 0 && totalItemCount < selectedBundle.minItems && (
                                            <p className="text-xs text-amber-600 mt-3">
                                                Add {selectedBundle.minItems - totalItemCount} more item{selectedBundle.minItems - totalItemCount !== 1 ? "s" : ""} to unlock the {selectedBundle.discountPercent}% discount.
                                            </p>
                                        )}

                                        <button
                                            onClick={handleAddBundleToCart}
                                            disabled={!canAddToCart}
                                            className="w-full mt-5 bg-brand-red text-white py-3.5 rounded-xl font-semibold hover:bg-brand-red/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                                        >
                                            <ShoppingCart size={16} />
                                            Add Bundle to Cart
                                        </button>
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
