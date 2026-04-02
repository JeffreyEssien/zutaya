"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, PrepOption } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { useCartStore } from "@/lib/cartStore";
import Button from "@/components/ui/Button";
import StockIndicator from "@/components/ui/StockIndicator";
import { StorageBadge } from "@/components/ui/StorageBadge";
import PrepOptionsSelector from "@/components/modules/PrepOptionsSelector";
import { ShoppingBag, Truck, Shield, RotateCcw, Check, ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { WHATSAPP_NUMBER } from "@/lib/constants";

interface ProductDetailsProps {
    product: Product;
}

export default function ProductDetails({ product }: ProductDetailsProps) {
    const { addItem, open } = useCartStore();
    const [selectedVariant, setSelectedVariant] = useState<Product["variants"][0] | undefined>(
        product.variants && product.variants.length > 0 ? product.variants[0] : undefined
    );
    const [addedFeedback, setAddedFeedback] = useState(false);
    const [activeTab, setActiveTab] = useState<"description" | "details">("description");
    const [selectedPrepOptions, setSelectedPrepOptions] = useState<PrepOption[]>([]);

    const currentPrice = selectedVariant?.price || product.price;
    const currentStock = selectedVariant?.stock !== undefined ? selectedVariant.stock : product.stock;

    const prepFee = selectedPrepOptions.reduce((sum, opt) => sum + opt.extraFee, 0);

    const priceUnitLabel = product.priceUnit === "per_kg" ? "/ kg"
        : product.priceUnit === "per_pack" ? "/ pack"
        : product.priceUnit === "per_piece" ? "/ piece"
        : product.priceUnit === "whole" ? "" : "";

    const handleAdd = () => {
        addItem(product, selectedVariant, selectedPrepOptions);
        open();
        setAddedFeedback(true);
        setTimeout(() => setAddedFeedback(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center lg:sticky lg:top-28 lg:self-start"
        >
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-brand-dark/35 mb-6">
                <Link href="/" className="hover:text-brand-purple transition-colors">Home</Link>
                <ChevronRight size={10} />
                <Link href="/shop" className="hover:text-brand-purple transition-colors">Shop</Link>
                <ChevronRight size={10} />
                <Link href={`/shop?category=${product.category}`} className="hover:text-brand-purple transition-colors capitalize">{product.category}</Link>
                <ChevronRight size={10} />
                <span className="text-brand-dark/60 truncate max-w-[120px]">{product.name}</span>
            </nav>

            {/* Category + Title */}
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-purple font-semibold mb-3">{product.category}</p>
            <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-brand-dark leading-tight">{product.name}</h1>
                {product.storageType && <StorageBadge type={product.storageType} />}
            </div>
            <p className="text-sm text-brand-dark/35 mb-5">by {product.brand}</p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
                <p className="font-serif text-3xl font-bold text-brand-dark">
                    {formatCurrency(currentPrice)}
                    {priceUnitLabel && <span className="text-lg font-normal text-brand-dark/40 ml-1">{priceUnitLabel}</span>}
                </p>
            </div>

            {/* Description Tabs */}
            <div className="mb-8">
                <div className="flex gap-6 border-b border-brand-lilac/10 mb-4">
                    {(["description", "details"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-xs font-semibold uppercase tracking-[0.15em] transition-colors relative cursor-pointer ${activeTab === tab
                                ? "text-brand-dark"
                                : "text-brand-dark/30 hover:text-brand-dark/60"
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-purple rounded-full"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <AnimatePresence mode="wait">
                    {activeTab === "description" ? (
                        <motion.div
                            key="desc"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="product-description text-brand-dark/55 leading-relaxed text-[15px]"
                            dangerouslySetInnerHTML={{ __html: product.description || "" }}
                        />
                    ) : (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-2.5"
                        >
                            <DetailRow label="Brand" value={product.brand} />
                            <DetailRow label="Category" value={product.category} />
                            {product.cutType && <DetailRow label="Cut Type" value={product.cutType} />}
                            {product.storageType && <DetailRow label="Storage" value={product.storageType} />}
                            {product.priceUnit && <DetailRow label="Price Unit" value={product.priceUnit.replace("_", " ")} />}
                            <DetailRow label="SKU" value={product.id.slice(0, 8).toUpperCase()} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
                <div className="mb-6">
                    <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-3">
                        Options
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {product.variants.map((v) => (
                            <button
                                key={v.name}
                                onClick={() => setSelectedVariant(v)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${selectedVariant?.name === v.name
                                    ? "bg-brand-dark text-white shadow-md"
                                    : "bg-neutral-50 text-brand-dark/70 hover:bg-neutral-100 border border-brand-dark/8 hover:border-brand-dark/20"
                                    }`}
                            >
                                {v.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stock */}
            <div className="mb-6">
                <StockIndicator stock={currentStock} />
            </div>

            {/* Prep Options */}
            {product.prepOptions && product.prepOptions.length > 0 && (
                <div className="mb-6">
                    <PrepOptionsSelector
                        options={product.prepOptions}
                        selected={selectedPrepOptions}
                        onChange={setSelectedPrepOptions}
                    />
                </div>
            )}

            {/* Add to Cart Button */}
            <Button
                size="lg"
                onClick={handleAdd}
                disabled={currentStock === 0}
                className="w-full sm:w-auto luxury-button"
            >
                <span className="flex items-center justify-center gap-2">
                    {addedFeedback ? (
                        <>
                            <Check size={18} />
                            Added to Cart!
                        </>
                    ) : (
                        <>
                            <ShoppingBag size={18} />
                            {currentStock === 0 ? "Sold Out" : "Add to Cart"}
                        </>
                    )}
                </span>
            </Button>

            {/* Ask About This on WhatsApp */}
            <button
                onClick={() => {
                    const message = encodeURIComponent(
                        `Hi! I'm interested in *${product.name}* (${formatCurrency(currentPrice)}). Is it available?`
                    );
                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
                }}
                className="w-full sm:w-auto mt-3 flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-[#25D366] bg-[#25D366]/8 hover:bg-[#25D366]/15 border border-[#25D366]/20 hover:border-[#25D366]/40 transition-all duration-200 cursor-pointer"
            >
                <MessageCircle size={16} fill="#25D366" strokeWidth={0} />
                Ask About This on WhatsApp
            </button>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-2.5">
                <TrustBadge icon={Truck} label="Fast Delivery" sublabel="Nationwide" />
                <TrustBadge icon={Shield} label="Authentic" sublabel="100% Genuine" />
                <TrustBadge icon={RotateCcw} label="Easy Returns" sublabel="7-day Policy" />
            </div>
        </motion.div>
    );
}

function TrustBadge({ icon: Icon, label, sublabel }: { icon: React.ElementType; label: string; sublabel: string }) {
    return (
        <div className="text-center p-3 rounded-xl bg-neutral-50/70 border border-brand-lilac/8 hover:border-brand-lilac/20 transition-colors group">
            <Icon size={16} className="mx-auto text-brand-purple/70 mb-1.5 group-hover:text-brand-purple transition-colors" />
            <p className="text-[10px] font-semibold text-brand-dark/70">{label}</p>
            <p className="text-[9px] text-brand-dark/30 mt-0.5">{sublabel}</p>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm py-2 border-b border-brand-lilac/5 last:border-0">
            <span className="text-brand-dark/35 text-xs uppercase tracking-wide">{label}</span>
            <span className="text-brand-dark font-medium capitalize text-sm">{value}</span>
        </div>
    );
}
