"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatCurrency";
import type { Product } from "@/types";
import { useCartStore } from "@/lib/cartStore";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { ShoppingBag, Heart, Eye } from "lucide-react";
import { StorageBadge } from "@/components/ui/StorageBadge";
import { useState } from "react";
import { toast } from "sonner";
import QuickViewModal from "@/components/modules/QuickViewModal";

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCartStore();
    const [justAdded, setJustAdded] = useState(false);
    const [quickViewOpen, setQuickViewOpen] = useState(false);

    const handleQuickAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(product);
        setJustAdded(true);
        toast.success(`${product.name} added to cart`, {
            description: formatCurrency(product.price),
        });
        setTimeout(() => setJustAdded(false), 1500);
    };

    const handleQuickView = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setQuickViewOpen(true);
    };

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const totalStock = variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
        : product.stock;
    const isSoldOut = totalStock === 0;
    const isLowStock = totalStock <= LOW_STOCK_THRESHOLD && totalStock > 0;

    return (
        <>
            <div className="group relative">
                <Link href={`/product/${product.slug}`} className="block">
                    {/* Image */}
                    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-50">
                        {product.images[0] ? (
                            <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-400">
                                <ShoppingBag size={48} strokeWidth={1} />
                            </div>
                        )}

                        {/* Second image on hover */}
                        {product.images[1] && (
                            <Image
                                src={product.images[1]}
                                alt={`${product.name} hover`}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
                            />
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                            {product.isNew && totalStock > LOW_STOCK_THRESHOLD && (
                                <span className="bg-brand-dark text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                    New
                                </span>
                            )}
                            {isLowStock && (
                                <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[9px] sm:text-[10px] font-semibold px-2.5 py-1 rounded-full">
                                    Only {totalStock} left
                                </span>
                            )}
                            {isSoldOut && (
                                <span className="bg-neutral-800/90 backdrop-blur-sm text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                    Sold Out
                                </span>
                            )}
                        </div>

                        {/* Top-right action buttons */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-400">
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="p-2 rounded-full bg-white/80 backdrop-blur-sm text-brand-dark/40 hover:text-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all"
                            >
                                <Heart size={14} strokeWidth={1.5} />
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickView}
                                className="p-2 rounded-full bg-white/80 backdrop-blur-sm text-brand-dark/40 hover:text-brand-purple cursor-pointer shadow-sm hover:shadow-md transition-all"
                            >
                                <Eye size={14} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Quick Add — desktop only */}
                        <button
                            type="button"
                            onClick={handleQuickAdd}
                            disabled={isSoldOut}
                            className="hidden sm:flex absolute bottom-3 left-3 right-3 items-center justify-center gap-2 bg-white/95 backdrop-blur-md text-brand-dark text-xs font-semibold tracking-wide py-3 rounded-full opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:bg-white active:scale-[0.97]"
                        >
                            {isSoldOut ? (
                                "Sold Out"
                            ) : justAdded ? (
                                <span className="flex items-center gap-1.5 text-brand-purple">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                    Added
                                </span>
                            ) : (
                                <>
                                    <ShoppingBag size={13} />
                                    Add to Cart
                                </>
                            )}
                        </button>
                    </div>

                    {/* Info */}
                    <div className="mt-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-brand-dark/35 uppercase tracking-[0.15em] font-medium">
                                {product.category}
                            </p>
                            {product.storageType && <StorageBadge type={product.storageType} />}
                        </div>
                        <h3 className="font-serif text-[15px] text-brand-dark leading-snug line-clamp-1 group-hover:text-brand-purple transition-colors duration-300">
                            {product.name}
                        </h3>
                        <div className="flex items-baseline gap-1.5 pt-0.5">
                            <p className="font-serif text-base font-semibold text-brand-dark">
                                {formatCurrency(product.price)}
                            </p>
                            {product.priceUnit && (
                                <span className="text-[10px] text-brand-dark/35 font-light">
                                    / {product.priceUnit === "per_kg" ? "kg" : product.priceUnit === "per_pack" ? "pack" : product.priceUnit === "per_piece" ? "piece" : "whole"}
                                </span>
                            )}
                        </div>
                    </div>
                </Link>
            </div>

            {/* Quick View Modal */}
            <QuickViewModal
                product={product}
                isOpen={quickViewOpen}
                onClose={() => setQuickViewOpen(false)}
            />
        </>
    );
}
