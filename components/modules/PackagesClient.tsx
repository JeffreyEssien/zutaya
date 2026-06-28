"use client";

import { useState } from "react";
import type { ZutayaPackage } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { useCartStore } from "@/lib/cartStore";
import SafeImage from "@/components/ui/SafeImage";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Check, ShoppingCart, Minus, Plus, X, Sparkles, Ban } from "lucide-react";
import { getText } from "@/lib/textDefaults";

interface Props {
    packages: ZutayaPackage[];
    customTexts?: Record<string, string>;
}

export default function PackagesClient({ packages, customTexts }: Props) {
    const [active, setActive] = useState<ZutayaPackage | null>(null);
    const [boxes, setBoxes] = useState(1);
    const [added, setAdded] = useState(false);
    const addPackageToCart = useCartStore((s) => s.addPackageToCart);
    const openCart = useCartStore((s) => s.open);

    const openPackage = (pkg: ZutayaPackage) => {
        if (pkg.available === false) return;
        setActive(pkg);
        setBoxes(1);
        setAdded(false);
    };

    const handleAdd = () => {
        if (!active || active.available === false) return;
        addPackageToCart(active, boxes);
        setAdded(true);
        setActive(null);
        openCart();
    };

    return (
        <div className="min-h-screen bg-brand-dark">
            {/* Hero */}
            <div className="relative overflow-hidden border-b border-warm-cream/10">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 via-transparent to-brand-red/5" />
                <div className="relative max-w-6xl mx-auto px-4 py-14 sm:py-20">
                    <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm text-warm-cream/50 hover:text-warm-cream mb-6 transition-colors">
                        <ArrowLeft size={15} /> Back to shop
                    </Link>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-green bg-brand-green/10 px-3 py-1 rounded-full">
                            <Sparkles size={12} /> Curated boxes
                        </span>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-5xl text-warm-cream max-w-2xl">
                        {getText(customTexts, "bundles.heading")}
                    </h1>
                    <p className="text-warm-cream/50 mt-4 max-w-xl text-sm sm:text-base">
                        {getText(customTexts, "bundles.desc")}
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-6xl mx-auto px-4 py-12">
                {packages.length === 0 ? (
                    <div className="text-center py-20">
                        <Package size={40} className="mx-auto text-warm-cream/20 mb-4" />
                        <p className="text-warm-cream/40">No packages available right now. Please check back soon.</p>
                        <Link href="/shop" className="inline-block mt-5 text-brand-green hover:underline text-sm">Browse the shop instead →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {packages.map((pkg, i) => {
                            const soldOut = pkg.available === false;
                            return (
                                <motion.button
                                    key={pkg.id}
                                    id={pkg.slug}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    onClick={() => openPackage(pkg)}
                                    disabled={soldOut}
                                    aria-disabled={soldOut}
                                    className={`group text-left rounded-2xl overflow-hidden bg-[#222] border border-warm-cream/10 transition-colors flex flex-col scroll-mt-24 ${soldOut ? "opacity-60 cursor-not-allowed" : "hover:border-brand-green/40"}`}
                                >
                                    <div className="relative aspect-[4/3] bg-warm-cream/5">
                                        {pkg.imageUrl ? (
                                            <SafeImage src={pkg.imageUrl} alt={pkg.name} fill className={`object-cover transition-transform duration-500 ${soldOut ? "grayscale" : "group-hover:scale-105"}`} sizes="(max-width:640px) 100vw, 33vw" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-warm-cream/15"><Package size={40} /></div>
                                        )}
                                        {soldOut ? (
                                            <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white bg-black/70 px-2.5 py-1 rounded-full">
                                                <Ban size={11} /> Currently unavailable
                                            </span>
                                        ) : pkg.tagline ? (
                                            <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider text-white bg-brand-red/90 px-2.5 py-1 rounded-full">
                                                {pkg.tagline}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <h3 className="font-serif text-xl text-warm-cream">{pkg.name}</h3>
                                        <ul className="mt-3 space-y-1.5 flex-1">
                                            {pkg.items.slice(0, 5).map((it, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-[13px] text-warm-cream/55">
                                                    <Check size={13} className="text-brand-green shrink-0" />
                                                    <span className="truncate">{it.label || it.productName}</span>
                                                </li>
                                            ))}
                                            {pkg.items.length > 5 && (
                                                <li className="text-[12px] text-warm-cream/35 pl-5">+{pkg.items.length - 5} more</li>
                                            )}
                                        </ul>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-warm-cream/8">
                                            <span className="text-lg font-bold text-warm-cream">{formatCurrency(pkg.price)}</span>
                                            {soldOut ? (
                                                <span className="text-xs font-semibold text-warm-cream/35">Sold out</span>
                                            ) : (
                                                <span className="text-xs font-semibold text-brand-green flex items-center gap-1 group-hover:gap-2 transition-all">
                                                    View box <ArrowLeft size={13} className="rotate-180" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail modal */}
            <AnimatePresence>
                {active && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setActive(null)}
                            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 20 }}
                            transition={{ type: "spring", damping: 26, stiffness: 300 }}
                            className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[75] bg-[#1d1d1d] rounded-2xl border border-warm-cream/15 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="relative aspect-[16/9] bg-warm-cream/5 shrink-0">
                                {active.imageUrl ? (
                                    <SafeImage src={active.imageUrl} alt={active.name} fill className="object-cover" sizes="512px" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-warm-cream/15"><Package size={48} /></div>
                                )}
                                <button onClick={() => setActive(null)} className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <h2 className="font-serif text-2xl text-warm-cream">{active.name}</h2>
                                {active.description && <p className="text-sm text-warm-cream/50 mt-1.5">{active.description}</p>}

                                <div className="mt-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-cream/40 mb-2">What's inside</p>
                                    <ul className="space-y-2">
                                        {active.items.map((it, idx) => {
                                            const out = it.available === false;
                                            return (
                                                <li key={idx} className={`flex items-center gap-2.5 text-sm ${out ? "text-warm-cream/35" : "text-warm-cream/70"}`}>
                                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${out ? "bg-warm-cream/10 text-warm-cream/40" : "bg-brand-green/15 text-brand-green"}`}>
                                                        {out ? <Ban size={11} /> : <Check size={12} />}
                                                    </span>
                                                    <span>{it.label || it.productName}</span>
                                                    {out && <span className="text-[10px] text-red-400/80 ml-1">out of stock</span>}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>

                                <div className="flex items-center justify-between mt-6 pt-5 border-t border-warm-cream/10">
                                    <div>
                                        <p className="text-[11px] text-warm-cream/40">Total</p>
                                        <p className="text-2xl font-bold text-warm-cream">{formatCurrency(active.price * boxes)}</p>
                                    </div>
                                    <div className="flex items-center bg-warm-cream/5 rounded-full overflow-hidden border border-warm-cream/10">
                                        <button onClick={() => setBoxes((b) => Math.max(1, b - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-warm-cream/5 text-warm-cream"><Minus size={14} /></button>
                                        <span className="w-9 text-center text-sm font-semibold text-warm-cream">{boxes}</span>
                                        <button onClick={() => setBoxes((b) => b + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-warm-cream/5 text-warm-cream"><Plus size={14} /></button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAdd}
                                    disabled={active.available === false}
                                    className="mt-5 w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-warm-cream/10 disabled:text-warm-cream/40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    {active.available === false ? (
                                        <><Ban size={16} /> Currently unavailable</>
                                    ) : (
                                        <><ShoppingCart size={17} /> Add {boxes > 1 ? `${boxes} boxes` : "to cart"} · {formatCurrency(active.price * boxes)}</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Added confirmation */}
            <AnimatePresence>
                {added && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-brand-green text-white px-5 py-3 rounded-full text-sm font-semibold shadow-xl flex items-center gap-2"
                        onAnimationComplete={() => setTimeout(() => setAdded(false), 1800)}
                    >
                        <Check size={16} /> Package added to cart
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
