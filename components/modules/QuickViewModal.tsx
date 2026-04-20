"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { X, ShoppingBag, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { useCartStore } from "@/lib/cartStore";
import Button from "@/components/ui/Button";
import StockIndicator from "@/components/ui/StockIndicator";
import { toast } from "sonner";

interface QuickViewModalProps {
    product: Product;
    isOpen: boolean;
    onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
    const { addItem, open } = useCartStore();
    const [imageIndex, setImageIndex] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(
        product.variants?.length ? product.variants[0] : undefined
    );
    const [added, setAdded] = useState(false);

    const currentPrice = selectedVariant?.price || product.price;
    const currentStock = selectedVariant?.stock !== undefined ? selectedVariant.stock : product.stock;

    const handleAdd = () => {
        addItem(product, selectedVariant);
        setAdded(true);
        toast.success(`${product.name} added to cart`, {
            action: {
                label: "View Cart",
                onClick: () => open(),
            },
        });
        setTimeout(() => setAdded(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
                    onClick={onClose}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative bg-[#222] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-0"
                    >
                        {/* Close */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-3 right-3 z-10 p-2 bg-[#222]/90 backdrop-blur-sm rounded-full hover:bg-[#222] shadow-md transition-all cursor-pointer"
                        >
                            <X size={16} className="text-warm-cream/60" />
                        </button>

                        {/* Image */}
                        <div className="relative aspect-[3/4] bg-warm-cream/5 rounded-l-2xl overflow-hidden">
                            <Image
                                src={product.images[imageIndex]}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                            />

                            {product.images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setImageIndex((i) => (i - 1 + product.images.length) % product.images.length)}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-[#222]/80 rounded-full hover:bg-[#222] shadow transition-all cursor-pointer"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImageIndex((i) => (i + 1) % product.images.length)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#222]/80 rounded-full hover:bg-[#222] shadow transition-all cursor-pointer"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </>
                            )}

                            {/* Image dots */}
                            {product.images.length > 1 && (
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {product.images.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setImageIndex(i)}
                                            className={`rounded-full transition-all cursor-pointer ${i === imageIndex
                                                    ? "w-5 h-1.5 bg-[#222] shadow"
                                                    : "w-1.5 h-1.5 bg-[#222]/50"
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="p-6 md:p-8 flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.25em] text-brand-green font-semibold mb-2">{product.category}</p>
                                <h3 className="font-serif text-xl md:text-2xl text-warm-cream mb-1">{product.name}</h3>
                                <p className="text-xs text-warm-cream/35 mb-4">by {product.brand}</p>
                                <p className="font-serif text-2xl font-bold text-warm-cream mb-5">{formatCurrency(currentPrice)}</p>

                                {product.description && (
                                    <div
                                        className="text-sm text-warm-cream/50 leading-relaxed mb-5 line-clamp-3"
                                        dangerouslySetInnerHTML={{ __html: product.description }}
                                    />
                                )}

                                {/* Variants */}
                                {product.variants && product.variants.length > 0 && (
                                    <div className="mb-5">
                                        <label className="block text-[10px] font-semibold text-warm-cream/40 uppercase tracking-[0.15em] mb-2">Options</label>
                                        <div className="flex flex-wrap gap-2">
                                            {product.variants.map((v) => (
                                                <button
                                                    key={v.name}
                                                    onClick={() => setSelectedVariant(v)}
                                                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${selectedVariant?.name === v.name
                                                            ? "bg-brand-dark text-white"
                                                            : "bg-warm-cream/5 text-warm-cream/60 hover:bg-warm-cream/5 border border-warm-cream/8"
                                                        }`}
                                                >
                                                    {v.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <StockIndicator stock={currentStock} />
                            </div>

                            <div className="mt-6 space-y-3">
                                <Button
                                    size="lg"
                                    onClick={handleAdd}
                                    disabled={currentStock === 0}
                                    className="w-full"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        {added ? (
                                            <><Check size={16} /> Added!</>
                                        ) : (
                                            <><ShoppingBag size={16} /> {currentStock === 0 ? "Sold Out" : "Add to Cart"}</>
                                        )}
                                    </span>
                                </Button>
                                <Link href={`/product/${product.slug}`} onClick={onClose} className="block">
                                    <button className="w-full text-xs text-warm-cream/40 hover:text-brand-green transition-colors py-2 cursor-pointer">
                                        View Full Details →
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
