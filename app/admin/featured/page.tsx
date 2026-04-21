"use client";

import { useState, useEffect, useCallback } from "react";
import { getSiteSettings, updateSiteSettings, getProducts } from "@/lib/queries";
import { formatCurrency } from "@/lib/formatCurrency";
import type { FeaturedSlide, Product, MediaItem, SiteSettings, HeroDisplayConfig } from "@/types";
import MediaPicker from "@/components/modules/MediaPicker";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { logAction } from "@/lib/auditClient";
import { revalidateShop } from "@/app/actions";
import {
    Star, Plus, GripVertical, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
    ShoppingBag, ImageIcon, Megaphone, Save, Loader2, Search, X, ArrowRight,
    Monitor, Sparkles, LayoutGrid, List, Film, Type, Link2, MousePointer,
    Package, ChevronLeft, ChevronRight, Play, Pause, ExternalLink, Settings2,
    Layers, Zap,
} from "lucide-react";

function generateId() {
    return `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const OVERLAY_POSITIONS = [
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-right", label: "Bottom Right" },
    { value: "center", label: "Center" },
    { value: "top-left", label: "Top Left" },
] as const;

const OVERLAY_STYLES = [
    { value: "dark", label: "Dark", preview: "bg-black/60 text-white" },
    { value: "light", label: "Light", preview: "bg-white/80 text-warm-cream" },
    { value: "gradient", label: "Gradient", preview: "bg-gradient-to-t from-black/70 to-transparent text-white" },
] as const;

type SlideType = FeaturedSlide["type"];

export default function FeaturedPage() {
    const [slides, setSlides] = useState<FeaturedSlide[]>([]);
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [heroDisplay, setHeroDisplay] = useState<HeroDisplayConfig>({ mode: "slideshow", mediaIds: [], slideshowInterval: 5, useFeaturedSlides: false });
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSlide, setExpandedSlide] = useState<string | null>(null);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [productSearchOpen, setProductSearchOpen] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [mediaPickerTarget, setMediaPickerTarget] = useState<"slide" | "promo">("slide");
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [settingsData, productsData] = await Promise.all([
                getSiteSettings(),
                getProducts(),
            ]);
            if (settingsData) {
                setSettings(settingsData);
                setSlides(settingsData.featuredSlides || []);
                setHeroDisplay(settingsData.heroDisplayConfig || { mode: "slideshow", mediaIds: [], slideshowInterval: 5, useFeaturedSlides: false });
            }
            setProducts(productsData);
        } catch {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const ordered = slides.map((s, i) => ({ ...s, order: i }));
            await updateSiteSettings({ featuredSlides: ordered, heroDisplayConfig: heroDisplay });
            await revalidateShop();
            await logAction("featured_slides_updated", `Updated ${ordered.length} featured slides`);
            toast.success("Featured slides saved!");
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const addProductSlide = (product: Product) => {
        const slide: FeaturedSlide = {
            id: generateId(),
            type: "product",
            isActive: true,
            order: slides.length,
            productId: product.id,
            headline: product.name,
            subtitle: formatCurrency(product.price),
            ctaText: "Shop Now",
            ctaLink: `/shop/${product.slug}`,
            overlayPosition: "bottom-left",
            overlayStyle: "dark",
            _resolvedProduct: product,
        };
        setSlides([...slides, slide]);
        setExpandedSlide(slide.id);
        setProductSearchOpen(false);
        setProductSearch("");
        setAddMenuOpen(false);
        toast.success(`Added "${product.name}" to featured`);
    };

    const addMediaSlide = (items: MediaItem[]) => {
        if (editingSlideId) {
            setSlides((prev) =>
                prev.map((s) =>
                    s.id === editingSlideId
                        ? { ...s, mediaId: items[0].id, mediaUrl: items[0].url, mediaType: items[0].type }
                        : s,
                ),
            );
            setEditingSlideId(null);
        } else {
            const newSlides = items.map((item, idx) => ({
                id: generateId(),
                type: "media" as const,
                isActive: true,
                order: slides.length + idx,
                mediaId: item.id,
                mediaUrl: item.url,
                mediaType: item.type,
                headline: "",
                subtitle: "",
                ctaText: "",
                ctaLink: "",
                overlayPosition: "bottom-left" as const,
                overlayStyle: "dark" as const,
            }));
            setSlides([...slides, ...newSlides]);
            if (newSlides.length === 1) setExpandedSlide(newSlides[0].id);
            toast.success(`Added ${newSlides.length} media slide(s)`);
        }
        setAddMenuOpen(false);
    };

    const addPromoSlide = () => {
        const slide: FeaturedSlide = {
            id: generateId(),
            type: "promo",
            isActive: true,
            order: slides.length,
            headline: "Special Offer",
            subtitle: "Don't miss our latest deals",
            ctaText: "Shop Now",
            ctaLink: "/shop",
            overlayPosition: "center",
            overlayStyle: "gradient",
        };
        setSlides([...slides, slide]);
        setExpandedSlide(slide.id);
        setAddMenuOpen(false);
    };

    const updateSlide = (id: string, updates: Partial<FeaturedSlide>) => {
        setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const removeSlide = (id: string) => {
        setSlides((prev) => prev.filter((s) => s.id !== id));
        if (expandedSlide === id) setExpandedSlide(null);
    };

    const moveSlide = (idx: number, dir: -1 | 1) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= slides.length) return;
        const arr = [...slides];
        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        setSlides(arr);
    };

    const duplicateSlide = (slide: FeaturedSlide) => {
        const dupe = { ...slide, id: generateId(), order: slides.length };
        setSlides([...slides, dupe]);
        toast.success("Slide duplicated");
    };

    // Drag and drop
    const handleDragStart = (idx: number) => setDragIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        setDragOverIdx(idx);
    };
    const handleDrop = (idx: number) => {
        if (dragIdx === null || dragIdx === idx) {
            setDragIdx(null);
            setDragOverIdx(null);
            return;
        }
        const arr = [...slides];
        const [moved] = arr.splice(dragIdx, 1);
        arr.splice(idx, 0, moved);
        setSlides(arr);
        setDragIdx(null);
        setDragOverIdx(null);
    };

    const resolveProduct = (slide: FeaturedSlide) => {
        if (slide._resolvedProduct) return slide._resolvedProduct;
        return products.find((p) => p.id === slide.productId);
    };

    const getSlideImageUrl = (slide: FeaturedSlide): string | null => {
        if (slide.type === "product") {
            const prod = resolveProduct(slide);
            return prod?.images?.[0] || null;
        }
        if (slide.type === "media") return slide.mediaUrl || null;
        if (slide.type === "promo") return slide.promoImageUrl || slide.mediaUrl || null;
        return null;
    };

    const activeSlides = slides.filter((s) => s.isActive);
    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase()),
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-brand-green/40" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                            <Star size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-serif text-warm-cream font-bold">Featured Slides</h1>
                    </div>
                    <p className="text-sm text-warm-cream/50">Curate the hero slideshow — add products, media, or custom promos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setPreviewMode(true); setPreviewIndex(0); }}
                        disabled={activeSlides.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/10 text-sm text-warm-cream/60 hover:border-brand-green/30 hover:text-brand-green transition-all cursor-pointer disabled:opacity-40"
                    >
                        <Eye size={16} /> Preview
                    </button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="!bg-brand-green !text-white hover:!bg-brand-green/90 gap-2"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Hero Mode Toggle */}
            <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${heroDisplay.useFeaturedSlides ? "bg-brand-green/[0.08] border-brand-green/30" : "bg-white/[0.04] border-warm-cream/15"}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${heroDisplay.useFeaturedSlides ? "bg-brand-green/20" : "bg-amber-500/10"}`}>
                            <Zap size={18} className={heroDisplay.useFeaturedSlides ? "text-brand-green" : "text-amber-500"} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-warm-cream">Use Featured Slides in Hero</h3>
                                <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${heroDisplay.useFeaturedSlides ? "bg-brand-green/20 text-brand-green" : "bg-warm-cream/10 text-warm-cream/40"}`}>
                                    {heroDisplay.useFeaturedSlides ? "Active" : "Off"}
                                </span>
                            </div>
                            <p className="text-xs text-warm-cream/40 mt-0.5">When enabled, the hero slideshow uses your curated slides instead of raw gallery media</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setHeroDisplay((prev) => ({
                            ...prev,
                            mode: prev.useFeaturedSlides ? prev.mode : "slideshow",
                            useFeaturedSlides: !prev.useFeaturedSlides,
                        }))}
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${heroDisplay.useFeaturedSlides ? "bg-brand-green" : "bg-warm-cream/20"}`}
                    >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${heroDisplay.useFeaturedSlides ? "left-[26px]" : "left-0.5"}`} />
                    </button>
                </div>

                {heroDisplay.useFeaturedSlides && (
                    <div className="mt-4 pt-4 border-t border-warm-cream/10 flex items-center gap-4">
                        <label className="text-xs text-warm-cream/50 font-medium">Slide Interval</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min={2}
                                max={15}
                                value={heroDisplay.slideshowInterval}
                                onChange={(e) => setHeroDisplay((prev) => ({ ...prev, slideshowInterval: parseInt(e.target.value) }))}
                                className="w-32 accent-brand-green"
                            />
                            <span className="text-xs text-warm-cream/60 w-8">{heroDisplay.slideshowInterval}s</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Slides", value: slides.length, icon: Layers, color: "text-blue-600 bg-blue-50" },
                    { label: "Active", value: activeSlides.length, icon: Eye, color: "text-emerald-600 bg-emerald-50" },
                    { label: "Inactive", value: slides.length - activeSlides.length, icon: EyeOff, color: "text-warm-cream/40 bg-warm-cream/[0.03]" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white/[0.04] rounded-xl border border-warm-cream/10 p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                            <stat.icon size={18} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-warm-cream">{stat.value}</p>
                            <p className="text-[10px] text-warm-cream/40 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Slide Actions */}
            <div className="relative">
                <button
                    onClick={() => setAddMenuOpen(!addMenuOpen)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-green to-brand-green/80 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-brand-green/20 transition-all cursor-pointer"
                >
                    <Plus size={18} /> Add Slide
                    <ChevronDown size={14} className={`transition-transform ${addMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {addMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-deep-espresso rounded-xl shadow-2xl border border-warm-cream/15 overflow-hidden z-30">
                        <button
                            onClick={() => { setProductSearchOpen(true); setAddMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-green/5 transition-colors cursor-pointer text-left"
                        >
                            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                                <ShoppingBag size={16} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-warm-cream">Product Slide</p>
                                <p className="text-[10px] text-warm-cream/40">Showcase a product with auto-filled details</p>
                            </div>
                        </button>
                        <button
                            onClick={() => { setMediaPickerTarget("slide"); setMediaPickerOpen(true); setAddMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-green/5 transition-colors cursor-pointer text-left border-t border-warm-cream/5"
                        >
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                <ImageIcon size={16} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-warm-cream">Media Slide</p>
                                <p className="text-[10px] text-warm-cream/40">Pick from gallery with optional text overlay</p>
                            </div>
                        </button>
                        <button
                            onClick={addPromoSlide}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-green/5 transition-colors cursor-pointer text-left border-t border-warm-cream/5"
                        >
                            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                                <Megaphone size={16} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-warm-cream">Promo Slide</p>
                                <p className="text-[10px] text-warm-cream/40">Custom headline, subtitle & CTA</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Slide List */}
            {slides.length === 0 ? (
                <div className="bg-white/[0.04] rounded-2xl border-2 border-dashed border-warm-cream/20 p-16 text-center">
                    <Sparkles size={40} className="mx-auto text-warm-cream/10 mb-4" />
                    <h3 className="text-lg font-serif text-warm-cream/50 mb-2">No featured slides yet</h3>
                    <p className="text-sm text-warm-cream/30 max-w-md mx-auto">
                        Add product highlights, gallery media, or custom promos to create a stunning hero slideshow.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {slides.map((slide, idx) => {
                        const isExpanded = expandedSlide === slide.id;
                        const product = slide.type === "product" ? resolveProduct(slide) : null;
                        const imageUrl = getSlideImageUrl(slide);
                        const typeLabel = slide.type === "product" ? "Product" : slide.type === "media" ? "Media" : "Promo";
                        const typeColor = slide.type === "product" ? "text-purple-600 bg-purple-50" : slide.type === "media" ? "text-blue-600 bg-blue-50" : "text-amber-600 bg-amber-50";

                        return (
                            <div
                                key={slide.id}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={() => handleDrop(idx)}
                                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                                className={`bg-white/[0.04] rounded-xl border transition-all ${
                                    dragOverIdx === idx
                                        ? "border-brand-green/40 shadow-lg shadow-brand-green/10"
                                        : slide.isActive
                                            ? "border-warm-cream/15 shadow-sm"
                                            : "border-brand-dark/8 opacity-60"
                                }`}
                            >
                                {/* Slide Header */}
                                <div
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                    onClick={() => setExpandedSlide(isExpanded ? null : slide.id)}
                                >
                                    <div className="cursor-grab active:cursor-grabbing text-warm-cream/20 hover:text-warm-cream/40" onClick={(e) => e.stopPropagation()}>
                                        <GripVertical size={16} />
                                    </div>

                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-brand-dark/5 flex-shrink-0">
                                        {imageUrl ? (
                                            slide.mediaType === "video" ? (
                                                <div className="w-full h-full flex items-center justify-center bg-deep-espresso/90">
                                                    <Film size={16} className="text-white/50" />
                                                </div>
                                            ) : (
                                                <Image src={imageUrl} alt="" width={48} height={48} className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon size={16} className="text-warm-cream/20" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
                                            <p className="text-sm font-medium text-warm-cream truncate">
                                                {slide.headline || (product ? product.name : "Untitled")}
                                            </p>
                                        </div>
                                        {slide.subtitle && (
                                            <p className="text-xs text-warm-cream/40 truncate mt-0.5">{slide.subtitle}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => moveSlide(idx, -1)}
                                            disabled={idx === 0}
                                            className="p-1.5 rounded-lg hover:bg-warm-cream/10 text-warm-cream/30 hover:text-warm-cream/60 transition-colors cursor-pointer disabled:opacity-20"
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => moveSlide(idx, 1)}
                                            disabled={idx === slides.length - 1}
                                            className="p-1.5 rounded-lg hover:bg-warm-cream/10 text-warm-cream/30 hover:text-warm-cream/60 transition-colors cursor-pointer disabled:opacity-20"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                        <button
                                            onClick={() => updateSlide(slide.id, { isActive: !slide.isActive })}
                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${slide.isActive ? "hover:bg-amber-50 text-emerald-500 hover:text-amber-500" : "hover:bg-emerald-50 text-warm-cream/20 hover:text-emerald-500"}`}
                                            title={slide.isActive ? "Deactivate" : "Activate"}
                                        >
                                            {slide.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                        <button
                                            onClick={() => duplicateSlide(slide)}
                                            className="p-1.5 rounded-lg hover:bg-warm-cream/10 text-warm-cream/20 hover:text-brand-green transition-colors cursor-pointer"
                                            title="Duplicate"
                                        >
                                            <Layers size={14} />
                                        </button>
                                        <button
                                            onClick={() => removeSlide(slide.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-warm-cream/20 hover:text-red-500 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <ChevronDown size={16} className={`text-warm-cream/20 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </div>

                                {/* Expanded Editor */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-warm-cream/10 pt-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Left — image/media */}
                                            <div>
                                                <label className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider mb-2 block">
                                                    {slide.type === "product" ? "Product Image" : "Slide Media"}
                                                </label>
                                                <div className="aspect-video rounded-xl overflow-hidden bg-brand-dark/5 relative group">
                                                    {imageUrl ? (
                                                        slide.mediaType === "video" ? (
                                                            <video src={imageUrl} className="w-full h-full object-cover" muted playsInline />
                                                        ) : (
                                                            <Image src={imageUrl} alt="" fill className="object-cover" sizes="400px" />
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <ImageIcon size={32} className="text-warm-cream/10" />
                                                        </div>
                                                    )}
                                                    {(slide.type === "media" || slide.type === "promo") && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingSlideId(slide.id);
                                                                setMediaPickerTarget(slide.type === "promo" ? "promo" : "slide");
                                                                setMediaPickerOpen(true);
                                                            }}
                                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                                        >
                                                            <span className="text-white text-xs font-medium bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                                                Change Media
                                                            </span>
                                                        </button>
                                                    )}

                                                    {/* Overlay Preview */}
                                                    {(slide.headline || slide.subtitle) && (
                                                        <OverlayPreview slide={slide} />
                                                    )}
                                                </div>

                                                {slide.type === "product" && product && (
                                                    <div className="mt-3 flex items-center gap-3 p-3 bg-purple-50/50 rounded-lg">
                                                        <Package size={14} className="text-purple-500" />
                                                        <div className="text-xs">
                                                            <p className="font-medium text-warm-cream">{product.name}</p>
                                                            <p className="text-warm-cream/40">{product.category} &middot; {formatCurrency(product.price)}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right — text overlay settings */}
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                        <Type size={12} /> Headline
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={slide.headline || ""}
                                                        onChange={(e) => updateSlide(slide.id, { headline: e.target.value })}
                                                        placeholder="e.g. Premium Beef Selection"
                                                        className="w-full px-3 py-2 rounded-lg border border-brand-dark/10 text-sm focus:outline-none focus:border-brand-green/30 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider mb-1.5 block">Subtitle</label>
                                                    <input
                                                        type="text"
                                                        value={slide.subtitle || ""}
                                                        onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })}
                                                        placeholder="e.g. Fresh, quality-assured cuts"
                                                        className="w-full px-3 py-2 rounded-lg border border-brand-dark/10 text-sm focus:outline-none focus:border-brand-green/30 transition-colors"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                            <MousePointer size={12} /> CTA Text
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={slide.ctaText || ""}
                                                            onChange={(e) => updateSlide(slide.id, { ctaText: e.target.value })}
                                                            placeholder="Shop Now"
                                                            className="w-full px-3 py-2 rounded-lg border border-brand-dark/10 text-sm focus:outline-none focus:border-brand-green/30 transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                            <Link2 size={12} /> CTA Link
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={slide.ctaLink || ""}
                                                            onChange={(e) => updateSlide(slide.id, { ctaLink: e.target.value })}
                                                            placeholder="/shop"
                                                            className="w-full px-3 py-2 rounded-lg border border-brand-dark/10 text-sm focus:outline-none focus:border-brand-green/30 transition-colors"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Overlay Position */}
                                                <div>
                                                    <label className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider mb-2 block">Overlay Position</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {OVERLAY_POSITIONS.map((pos) => (
                                                            <button
                                                                key={pos.value}
                                                                onClick={() => updateSlide(slide.id, { overlayPosition: pos.value })}
                                                                className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                                                                    slide.overlayPosition === pos.value
                                                                        ? "border-brand-green bg-brand-green/5 text-brand-green"
                                                                        : "border-brand-dark/8 text-warm-cream/40 hover:border-brand-dark/20"
                                                                }`}
                                                            >
                                                                {pos.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Overlay Style */}
                                                <div>
                                                    <label className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider mb-2 block">Overlay Style</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {OVERLAY_STYLES.map((style) => (
                                                            <button
                                                                key={style.value}
                                                                onClick={() => updateSlide(slide.id, { overlayStyle: style.value })}
                                                                className={`py-2 px-3 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                                                                    slide.overlayStyle === style.value
                                                                        ? "border-brand-green bg-brand-green/5 text-brand-green"
                                                                        : "border-brand-dark/8 text-warm-cream/40 hover:border-brand-dark/20"
                                                                }`}
                                                            >
                                                                {style.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Product Search Modal */}
            {productSearchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-deep-espresso rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col border border-warm-cream/15">
                        <div className="px-5 py-4 border-b border-warm-cream/10 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-warm-cream">Select Product</h3>
                            <button onClick={() => { setProductSearchOpen(false); setProductSearch(""); }} className="p-1 hover:bg-warm-cream/10 rounded-lg cursor-pointer">
                                <X size={16} className="text-warm-cream/40" />
                            </button>
                        </div>
                        <div className="px-5 py-3 border-b border-warm-cream/5">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-cream/30" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-brand-dark/10 text-sm focus:outline-none focus:border-brand-green/30"
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {filteredProducts.length === 0 ? (
                                <p className="py-10 text-center text-sm text-warm-cream/30">No products found</p>
                            ) : (
                                filteredProducts.map((product) => {
                                    const alreadyAdded = slides.some((s) => s.productId === product.id);
                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => !alreadyAdded && addProductSlide(product)}
                                            disabled={alreadyAdded}
                                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-brand-green/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left border-b border-warm-cream/5"
                                        >
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-dark/5 flex-shrink-0">
                                                {product.images[0] ? (
                                                    <Image src={product.images[0]} alt="" width={40} height={40} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package size={14} className="text-warm-cream/15" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-warm-cream truncate">{product.name}</p>
                                                <p className="text-xs text-warm-cream/40">{product.category} &middot; {formatCurrency(product.price)}</p>
                                            </div>
                                            {alreadyAdded && (
                                                <span className="text-[10px] text-brand-green font-medium">Added</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Media Picker */}
            <MediaPicker
                open={mediaPickerOpen}
                onClose={() => { setMediaPickerOpen(false); setEditingSlideId(null); }}
                multiple={!editingSlideId}
                filterType="all"
                title="Select Media for Slide"
                onSelect={(items) => {
                    if (editingSlideId) {
                        setSlides((prev) =>
                            prev.map((s) =>
                                s.id === editingSlideId
                                    ? { ...s, mediaId: items[0].id, mediaUrl: items[0].url, mediaType: items[0].type, promoImageUrl: items[0].type === "image" ? items[0].url : s.promoImageUrl }
                                    : s,
                            ),
                        );
                        setEditingSlideId(null);
                    } else {
                        addMediaSlide(items);
                    }
                    setMediaPickerOpen(false);
                }}
            />

            {/* Preview Modal */}
            {previewMode && activeSlides.length > 0 && (
                <SlidePreviewModal
                    slides={activeSlides}
                    products={products}
                    index={previewIndex}
                    onIndexChange={setPreviewIndex}
                    interval={heroDisplay.slideshowInterval}
                    onClose={() => setPreviewMode(false)}
                />
            )}
        </div>
    );
}

function OverlayPreview({ slide }: { slide: FeaturedSlide }) {
    const posClass = {
        "bottom-left": "bottom-3 left-3",
        "bottom-right": "bottom-3 right-3",
        "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center",
        "top-left": "top-3 left-3",
    }[slide.overlayPosition || "bottom-left"];

    const styleClass = {
        dark: "bg-black/60 text-white",
        light: "bg-white/80 text-warm-cream",
        gradient: "bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white",
    }[slide.overlayStyle || "dark"];

    const isGradient = slide.overlayStyle === "gradient";

    if (isGradient) {
        return (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-12">
                {slide.headline && <p className="text-sm font-bold text-white leading-tight">{slide.headline}</p>}
                {slide.subtitle && <p className="text-[10px] text-white/70 mt-0.5">{slide.subtitle}</p>}
                {slide.ctaText && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/80 mt-1.5 font-medium">
                        {slide.ctaText} <ArrowRight size={10} />
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`absolute ${posClass} ${styleClass} rounded-lg px-3 py-2 max-w-[70%] backdrop-blur-sm`}>
            {slide.headline && <p className="text-xs font-bold leading-tight">{slide.headline}</p>}
            {slide.subtitle && <p className="text-[9px] opacity-70 mt-0.5">{slide.subtitle}</p>}
            {slide.ctaText && (
                <span className="inline-flex items-center gap-1 text-[9px] opacity-80 mt-1 font-medium">
                    {slide.ctaText} <ArrowRight size={8} />
                </span>
            )}
        </div>
    );
}

function SlidePreviewModal({
    slides,
    products,
    index,
    onIndexChange,
    interval,
    onClose,
}: {
    slides: FeaturedSlide[];
    products: Product[];
    index: number;
    onIndexChange: (i: number) => void;
    interval: number;
    onClose: () => void;
}) {
    const [playing, setPlaying] = useState(true);

    useEffect(() => {
        if (!playing || slides.length <= 1) return;
        const timer = setInterval(() => {
            onIndexChange((index + 1) % slides.length);
        }, interval * 1000);
        return () => clearInterval(timer);
    }, [playing, index, slides.length, interval, onIndexChange]);

    const slide = slides[index];
    const product = slide?.type === "product" ? products.find((p) => p.id === slide.productId) : null;
    const imageUrl = slide?.type === "product"
        ? product?.images?.[0]
        : slide?.mediaUrl || slide?.promoImageUrl;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white/70 hover:bg-white/20 cursor-pointer z-20">
                <X size={20} />
            </button>

            {/* Slide Display */}
            <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-brand-dark/80">
                {imageUrl ? (
                    slide?.mediaType === "video" ? (
                        <video src={imageUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                        <Image src={imageUrl} alt="" fill className="object-cover" sizes="800px" />
                    )
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-dark/60 to-brand-dark/90" />
                )}

                {/* Overlay */}
                {slide && (slide.headline || slide.subtitle) && (
                    <OverlayPreview slide={slide} />
                )}

                {/* Nav arrows */}
                {slides.length > 1 && (
                    <>
                        <button
                            onClick={() => onIndexChange((index - 1 + slides.length) % slides.length)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 hover:bg-black/50 cursor-pointer"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => onIndexChange((index + 1) % slides.length)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 hover:bg-black/50 cursor-pointer"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                )}

                {/* Controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full px-4 py-2">
                    <button onClick={() => setPlaying(!playing)} className="text-white/70 hover:text-white cursor-pointer">
                        {playing ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => onIndexChange(i)}
                            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === index ? "bg-white w-6" : "bg-white/30 hover:bg-white/50"}`}
                        />
                    ))}
                    <span className="text-[10px] text-white/50 ml-2">{index + 1}/{slides.length}</span>
                </div>
            </div>
        </div>
    );
}
