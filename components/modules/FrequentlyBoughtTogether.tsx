"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import type { Product } from "@/types";
import { useCartStore, cartQuantityBounds } from "@/lib/cartStore";
import { formatCurrency } from "@/lib/formatCurrency";
import { Plus, Check, ShoppingBag } from "lucide-react";

function unitLabel(p: Product): string {
    switch (p.priceUnit) {
        case "per_kg": return "/kg";
        case "per_pack": return "/pack";
        case "per_piece": return "/piece";
        default: return "";
    }
}

export default function FrequentlyBoughtTogether({ suggestions }: { suggestions: Product[] }) {
    const { addItem, open } = useCartStore();
    const [selected, setSelected] = useState<Record<string, boolean>>(
        () => Object.fromEntries(suggestions.map((p) => [p.id, true])),
    );

    if (!suggestions.length) return null;

    const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

    // For a suggestion, the smallest addable quantity (min kg for weight items, else 1).
    const addQty = (p: Product) => {
        const variant = p.variants && p.variants.length > 0 ? p.variants[0] : undefined;
        const { min } = cartQuantityBounds({ product: p, variant });
        return { variant, qty: min };
    };

    const lineTotal = (p: Product) => {
        const { variant, qty } = addQty(p);
        return (variant?.price || p.price) * qty;
    };

    const chosen = suggestions.filter((p) => selected[p.id]);
    const total = chosen.reduce((s, p) => s + lineTotal(p), 0);

    const addOne = (p: Product) => {
        const { variant, qty } = addQty(p);
        addItem(p, variant, [], {}, undefined, qty);
        toast.success(`${p.name} added to cart`);
    };

    const addSelected = () => {
        if (chosen.length === 0) return;
        for (const p of chosen) {
            const { variant, qty } = addQty(p);
            addItem(p, variant, [], {}, undefined, qty);
        }
        toast.success(`${chosen.length} item${chosen.length > 1 ? "s" : ""} added to cart`);
        open();
    };

    return (
        <section className="max-w-7xl mx-auto px-6 py-10 border-t border-warm-cream/10">
            <h2 className="font-serif text-xl sm:text-2xl text-warm-cream mb-1">Frequently bought together</h2>
            <p className="text-sm text-warm-cream/50 mb-6">Customers often pair these with your pick.</p>

            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    {suggestions.map((p) => {
                        const { qty } = addQty(p);
                        const isWeight = p.priceUnit === "per_kg" && !(p.variants && p.variants.length);
                        return (
                            <div key={p.id} className={`relative rounded-xl border p-3 transition-colors ${selected[p.id] ? "border-brand-red/40 bg-brand-red/5" : "border-warm-cream/10 bg-surface"}`}>
                                <button
                                    onClick={() => toggle(p.id)}
                                    aria-label={selected[p.id] ? "Deselect" : "Select"}
                                    className={`absolute top-2 right-2 z-10 w-5 h-5 rounded-md flex items-center justify-center border ${selected[p.id] ? "bg-brand-red border-brand-red text-white" : "border-warm-cream/30 text-transparent"}`}
                                >
                                    <Check size={13} />
                                </button>
                                <Link href={`/product/${p.slug}`} className="block">
                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-base mb-2">
                                        {p.images?.[0] && (
                                            <Image src={p.images[0]} alt={p.name} fill sizes="200px" className="object-cover" />
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-warm-cream leading-tight line-clamp-2">{p.name}</p>
                                </Link>
                                <div className="flex items-center justify-between mt-1.5">
                                    <p className="text-sm font-semibold text-warm-cream">
                                        {formatCurrency(p.variants?.[0]?.price || p.price)}<span className="text-xs text-warm-cream/40">{unitLabel(p)}</span>
                                    </p>
                                    <button onClick={() => addOne(p)} className="text-xs inline-flex items-center gap-1 text-brand-green hover:text-brand-green/80 font-semibold">
                                        <Plus size={13} /> Add
                                    </button>
                                </div>
                                {isWeight && <p className="text-[10px] text-warm-cream/40 mt-0.5">adds {qty}kg</p>}
                            </div>
                        );
                    })}
                </div>

                <div className="lg:w-56 shrink-0 rounded-xl border border-warm-cream/10 bg-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-warm-cream/40 mb-1">{chosen.length} selected</p>
                    <p className="text-2xl font-bold text-warm-cream mb-3">{formatCurrency(total)}</p>
                    <button
                        onClick={addSelected}
                        disabled={chosen.length === 0}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors disabled:opacity-50"
                    >
                        <ShoppingBag size={15} /> Add to cart
                    </button>
                </div>
            </div>
        </section>
    );
}
