"use client";

import { useState, useEffect } from "react";
import { getSiteSettings, updateSiteSettings } from "@/lib/queries";
import { uploadProductImage } from "@/lib/uploadImage";
import type { SiteSettings } from "@/types";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import {
    Globe, Phone, MessageCircle, MapPin, Type, Megaphone,
    Instagram, Twitter, Music2, Facebook, BookOpen, Plus, Trash2,
    FileText, PackageCheck, Image as ImageIcon, Share2, Store, Save,
    Monitor, Play, Film, X,
} from "lucide-react";
import { logAction } from "@/lib/auditClient";
import { TEXT_GROUPS } from "@/lib/textDefaults";
import { revalidateShop } from "@/app/actions";
import type { HeroDisplayConfig, MediaItem } from "@/types";
import MediaPicker from "@/components/modules/MediaPicker";
import Image from "next/image";

type TabId = "general" | "storefront" | "business" | "checkout" | "texts";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "General", icon: Globe },
    { id: "storefront", label: "Storefront", icon: ImageIcon },
    { id: "business", label: "Business", icon: Store },
    { id: "checkout", label: "Checkout", icon: PackageCheck },
    { id: "texts", label: "Texts", icon: FileText },
];

export default function SiteSettingsForm() {
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [aboutStats, setAboutStats] = useState<{ value: string; label: string }[]>([]);
    const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<TabId>("general");
    const [heroDisplay, setHeroDisplay] = useState<HeroDisplayConfig>({ mode: "single", mediaIds: [], slideshowInterval: 5 });
    const [heroMediaItems, setHeroMediaItems] = useState<MediaItem[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await getSiteSettings();
            if (data) {
                setSettings(data);
                if (data.aboutStats) {
                    try { setAboutStats(JSON.parse(data.aboutStats)); } catch { /* ignore */ }
                }
                if (data.customTexts) {
                    setCustomTexts(typeof data.customTexts === "string" ? JSON.parse(data.customTexts) : data.customTexts);
                }
                if (data.heroDisplayConfig) {
                    const hdc = typeof data.heroDisplayConfig === "string" ? JSON.parse(data.heroDisplayConfig) : data.heroDisplayConfig;
                    setHeroDisplay(hdc);
                    // Fetch media items for the IDs
                    if (hdc.mediaIds?.length) {
                        fetch("/api/media").then(r => r.json()).then((all: any[]) => {
                            if (Array.isArray(all)) {
                                const items = all.filter((m: any) => hdc.mediaIds.includes(m.id)).map((m: any) => ({
                                    id: m.id, url: m.url, publicId: m.public_id, type: m.type,
                                    name: m.name, folder: m.folder, width: m.width, height: m.height,
                                    sizeBytes: m.size_bytes, createdAt: m.created_at,
                                }));
                                setHeroMediaItems(items);
                            }
                        }).catch(() => {});
                    }
                }
                if (!data.aboutStats) {
                    setAboutStats([
                        { value: "500+", label: "Happy Customers" },
                        { value: "24hrs", label: "Max Delivery Time" },
                        { value: "100%", label: "Cold-Chain Packed" },
                        { value: "6", label: "Days a Week" },
                    ]);
                }
            }
        } catch (error) {
            console.error("Failed to load settings", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            setSettings((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setSettings((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...settings, aboutStats: JSON.stringify(aboutStats), customTexts, heroDisplayConfig: heroDisplay };
            await updateSiteSettings(payload);
            await revalidateShop();
            logAction("update", "settings", undefined, "Updated site settings");
            toast.success("Settings saved successfully.");
        } catch {
            toast.error("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const toastId = toast.loading("Uploading image...");
        try {
            const url = await uploadProductImage(file);
            setSettings((prev) => ({ ...prev, [field]: url }));
            toast.success("Image uploaded successfully", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image", { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSave}>
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                                isActive
                                    ? "bg-brand-purple text-white shadow-sm"
                                    : "text-brand-dark/50 hover:text-brand-dark hover:bg-brand-dark/5"
                            }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="max-w-2xl">
                {/* ═══ GENERAL TAB ═══ */}
                {activeTab === "general" && (
                    <div className="space-y-8">
                        <Card title="Site Identity" description="Your brand name, logo and favicon">
                            <Field label="Site Name">
                                <input type="text" name="siteName" value={settings.siteName || ""} onChange={handleChange} className="settings-input" />
                            </Field>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Field label="Logo">
                                    <ImageUpload
                                        value={settings.logoUrl}
                                        name="logoUrl"
                                        onChange={handleChange}
                                        onUpload={(e) => handleImageUpload(e, "logoUrl")}
                                        uploadId="logo-upload"
                                        previewClass="h-12 w-auto"
                                    />
                                </Field>
                                <Field label="Favicon">
                                    <ImageUpload
                                        value={settings.faviconUrl}
                                        name="faviconUrl"
                                        onChange={handleChange}
                                        onUpload={(e) => handleImageUpload(e, "faviconUrl")}
                                        uploadId="favicon-upload"
                                        previewClass="h-8 w-8"
                                    />
                                </Field>
                            </div>
                        </Card>

                        <Card title="Social Media" description="Links to your social profiles" icon={Share2}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <SocialField label="Instagram" icon={Instagram} name="socialInstagram" value={settings.socialInstagram || ""} onChange={handleChange} placeholder="https://instagram.com/..." />
                                <SocialField label="Twitter / X" icon={Twitter} name="socialTwitter" value={settings.socialTwitter || ""} onChange={handleChange} placeholder="https://x.com/..." />
                                <SocialField label="TikTok" icon={Music2} name="socialTiktok" value={settings.socialTiktok || ""} onChange={handleChange} placeholder="https://tiktok.com/..." />
                                <SocialField label="Facebook" icon={Facebook} name="socialFacebook" value={settings.socialFacebook || ""} onChange={handleChange} placeholder="https://facebook.com/..." />
                            </div>
                        </Card>

                        <Card title="Footer" description="Tagline shown at the bottom of the site">
                            <Field label="Footer Tagline">
                                <input type="text" name="footerTagline" value={settings.footerTagline || ""} onChange={handleChange} className="settings-input" placeholder="Your tagline here..." />
                            </Field>
                        </Card>
                    </div>
                )}

                {/* ═══ STOREFRONT TAB ═══ */}
                {activeTab === "storefront" && (
                    <div className="space-y-8">
                        <Card title="Homepage Hero" description="Main banner on the homepage">
                            <Field label="Heading">
                                <input type="text" name="heroHeading" value={settings.heroHeading || ""} onChange={handleChange} className="settings-input" />
                            </Field>
                            <Field label="Subheading">
                                <input type="text" name="heroSubheading" value={settings.heroSubheading || ""} onChange={handleChange} className="settings-input" />
                            </Field>
                            <Field label="Hero Image (fallback)">
                                <ImageUpload
                                    value={settings.heroImage}
                                    name="heroImage"
                                    onChange={handleChange}
                                    onUpload={(e) => handleImageUpload(e, "heroImage")}
                                    uploadId="hero-upload"
                                    previewClass="h-32 w-full rounded-lg object-cover opacity-60"
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="CTA Text">
                                    <input type="text" name="heroCtaText" value={settings.heroCtaText || ""} onChange={handleChange} className="settings-input" />
                                </Field>
                                <Field label="CTA Link">
                                    <input type="text" name="heroCtaLink" value={settings.heroCtaLink || ""} onChange={handleChange} className="settings-input" />
                                </Field>
                            </div>
                        </Card>

                        {/* Hero Display Mode */}
                        <Card title="Hero Display Panel" description="Configure the right-side visual panel on the hero section" icon={Monitor}>
                            <Field label="Display Mode">
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { value: "single", label: "Single Image", icon: ImageIcon },
                                        { value: "slideshow", label: "Slideshow", icon: Play },
                                        { value: "video", label: "Video", icon: Film },
                                    ] as const).map((opt) => {
                                        const Icon = opt.icon;
                                        const active = heroDisplay.mode === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setHeroDisplay((prev) => ({ ...prev, mode: opt.value }))}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                                    active
                                                        ? "border-brand-red bg-brand-red/5 text-brand-red"
                                                        : "border-brand-dark/8 hover:border-brand-dark/20 text-brand-dark/50"
                                                }`}
                                            >
                                                <Icon size={20} />
                                                <span className="text-xs font-medium">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            {heroDisplay.mode === "slideshow" && (
                                <Field label="Slideshow Interval (seconds)">
                                    <input
                                        type="number"
                                        min={2}
                                        max={30}
                                        value={heroDisplay.slideshowInterval}
                                        onChange={(e) => setHeroDisplay((prev) => ({ ...prev, slideshowInterval: parseInt(e.target.value) || 5 }))}
                                        className="settings-input w-24"
                                    />
                                </Field>
                            )}

                            <Field label={heroDisplay.mode === "video" ? "Select Video" : "Select Images"}>
                                <button
                                    type="button"
                                    onClick={() => setPickerOpen(true)}
                                    className="w-full py-3 px-4 border-2 border-dashed border-brand-dark/15 rounded-xl text-sm text-brand-dark/50 hover:border-brand-red/30 hover:text-brand-red/60 transition-colors cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <ImageIcon size={16} />
                                    Choose from Gallery
                                </button>
                            </Field>

                            {/* Selected media preview */}
                            {heroMediaItems.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-brand-dark/50 uppercase tracking-wider">
                                        Selected ({heroMediaItems.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {heroMediaItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="relative w-20 h-20 rounded-lg overflow-hidden border border-brand-dark/10 group"
                                            >
                                                {item.type === "video" ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-deep-espresso/90">
                                                        <Film size={18} className="text-white/40" />
                                                    </div>
                                                ) : (
                                                    <Image src={item.url} alt={item.name} fill className="object-cover" sizes="80px" />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newItems = heroMediaItems.filter((m) => m.id !== item.id);
                                                        setHeroMediaItems(newItems);
                                                        setHeroDisplay((prev) => ({ ...prev, mediaIds: newItems.map((m) => m.id) }));
                                                    }}
                                                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                    <X size={10} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        <MediaPicker
                            open={pickerOpen}
                            onClose={() => setPickerOpen(false)}
                            multiple={heroDisplay.mode === "slideshow"}
                            filterType={heroDisplay.mode === "video" ? "video" : "image"}
                            title={heroDisplay.mode === "video" ? "Select Video" : "Select Images"}
                            onSelect={(items) => {
                                setHeroMediaItems(items);
                                setHeroDisplay((prev) => ({ ...prev, mediaIds: items.map((m) => m.id) }));
                            }}
                        />

                        <Card title="Announcement Bar" description="Top-of-page promotional banner" icon={Megaphone}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="announcementBarEnabled"
                                    checked={settings.announcementBarEnabled || false}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-brand-lilac/30 text-brand-purple focus:ring-brand-purple/30"
                                    id="announcement-toggle"
                                />
                                <label htmlFor="announcement-toggle" className="text-sm text-brand-dark/70 cursor-pointer">
                                    Show announcement bar
                                </label>
                            </div>
                            <Field label="Text">
                                <input type="text" name="announcementBarText" value={settings.announcementBarText || ""} onChange={handleChange} className="settings-input" placeholder="Free delivery on orders over ₦50,000!" />
                            </Field>
                            <Field label="Background Color">
                                <div className="flex items-center gap-3">
                                    <input type="color" name="announcementBarColor" value={settings.announcementBarColor || "#B665D2"} onChange={handleChange} className="h-9 w-12 rounded-lg border border-brand-lilac/20 cursor-pointer p-0.5" />
                                    <input type="text" name="announcementBarColor" value={settings.announcementBarColor || "#B665D2"} onChange={handleChange} className="settings-input flex-1 font-mono text-xs" placeholder="#B665D2" />
                                </div>
                            </Field>
                        </Card>

                        <Card title="Our Story & Features" description="About section on the homepage" icon={BookOpen}>
                            <Field label="Our Story Heading">
                                <input type="text" name="ourStoryHeading" value={settings.ourStoryHeading || ""} onChange={handleChange} className="settings-input" placeholder="Premium Meat, Delivered Fresh" />
                            </Field>
                            <Field label="Our Story Text">
                                <textarea
                                    name="ourStoryText"
                                    value={settings.ourStoryText || ""}
                                    onChange={handleChange}
                                    className="settings-input min-h-[120px] resize-y"
                                    placeholder="Separate paragraphs with double newlines..."
                                />
                            </Field>
                            <Field label="Why Zúta Ya Heading">
                                <input type="text" name="whyZutaYaHeading" value={settings.whyZutaYaHeading || ""} onChange={handleChange} className="settings-input" placeholder="Why Zúta Ya?" />
                            </Field>
                            <Field label="Features (one per line)">
                                <textarea
                                    name="whyZutaYaFeatures"
                                    value={settings.whyZutaYaFeatures || ""}
                                    onChange={handleChange}
                                    className="settings-input min-h-[100px] resize-y"
                                    placeholder="Fresh daily from trusted suppliers&#10;Cold-chain packed for guaranteed freshness"
                                />
                            </Field>
                        </Card>

                        <Card title="About Page" description="Promise text, quote, and stats">
                            <Field label="Promise Card Text">
                                <textarea
                                    name="aboutPromiseText"
                                    value={settings.aboutPromiseText || ""}
                                    onChange={handleChange}
                                    className="settings-input min-h-[80px] resize-y"
                                    placeholder="Every order is packed with care..."
                                />
                            </Field>
                            <Field label="Signature Quote">
                                <input type="text" name="aboutQuote" value={settings.aboutQuote || ""} onChange={handleChange} className="settings-input" placeholder="More than meat delivery. It's freshness..." />
                            </Field>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-brand-dark/60">Stats</label>
                                    {aboutStats.length < 6 && (
                                        <button
                                            type="button"
                                            onClick={() => setAboutStats((prev) => [...prev, { value: "", label: "" }])}
                                            className="inline-flex items-center gap-1 text-xs text-brand-purple hover:text-brand-purple/80 font-medium cursor-pointer"
                                        >
                                            <Plus size={13} /> Add
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {aboutStats.map((stat, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={stat.value}
                                                onChange={(e) => {
                                                    const next = [...aboutStats];
                                                    next[idx] = { ...next[idx], value: e.target.value };
                                                    setAboutStats(next);
                                                }}
                                                className="settings-input w-24 flex-shrink-0 text-center"
                                                placeholder="500+"
                                            />
                                            <input
                                                type="text"
                                                value={stat.label}
                                                onChange={(e) => {
                                                    const next = [...aboutStats];
                                                    next[idx] = { ...next[idx], label: e.target.value };
                                                    setAboutStats(next);
                                                }}
                                                className="settings-input flex-1"
                                                placeholder="Happy Customers"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAboutStats((prev) => prev.filter((_, i) => i !== idx))}
                                                className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══ BUSINESS TAB ═══ */}
                {activeTab === "business" && (
                    <div className="space-y-8">
                        <Card title="Contact Information" description="Phone, WhatsApp and address">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Phone Number" icon={Phone}>
                                    <input type="tel" name="businessPhone" value={settings.businessPhone || ""} onChange={handleChange} className="settings-input" placeholder="+234..." />
                                </Field>
                                <Field label="WhatsApp Number" icon={MessageCircle}>
                                    <input type="tel" name="businessWhatsapp" value={settings.businessWhatsapp || ""} onChange={handleChange} className="settings-input" placeholder="+234..." />
                                </Field>
                            </div>
                            <Field label="Business Address" icon={MapPin}>
                                <textarea
                                    name="businessAddress"
                                    value={settings.businessAddress || ""}
                                    onChange={handleChange}
                                    className="settings-input min-h-[80px] resize-y"
                                    placeholder="123 Main Street, Lagos, Nigeria"
                                />
                            </Field>
                        </Card>
                    </div>
                )}

                {/* ═══ CHECKOUT TAB ═══ */}
                {activeTab === "checkout" && (
                    <div className="space-y-8">
                        <Card title="Premium Packaging" description="Optional add-on offered at checkout" icon={PackageCheck}>
                            <Field label="Fee (NGN)">
                                <input
                                    type="number"
                                    name="packagingFee"
                                    value={settings.packagingFee ?? 500}
                                    onChange={(e) => setSettings((prev) => ({ ...prev, packagingFee: Number(e.target.value) }))}
                                    className="settings-input"
                                    min={0}
                                    step={50}
                                />
                            </Field>
                            <Field label="Label">
                                <input type="text" name="packagingLabel" value={settings.packagingLabel || ""} onChange={handleChange} className="settings-input" placeholder="Premium Packaging" />
                            </Field>
                            <Field label="Description">
                                <textarea
                                    name="packagingDescription"
                                    value={settings.packagingDescription || ""}
                                    onChange={handleChange}
                                    className="settings-input min-h-[70px] resize-y"
                                    placeholder="Insulated gift-ready packaging with ice packs..."
                                />
                            </Field>
                        </Card>
                    </div>
                )}

                {/* ═══ TEXTS TAB ═══ */}
                {activeTab === "texts" && (
                    <div className="space-y-8">
                        <p className="text-sm text-brand-dark/40">Override any text on the storefront. Leave blank to use the default.</p>
                        {TEXT_GROUPS.map((group) => (
                            <Card key={group.label} title={group.label}>
                                {group.keys.map((k) => (
                                    <Field key={k.key} label={k.label}>
                                        {k.multiline ? (
                                            <textarea
                                                value={customTexts[k.key] || ""}
                                                onChange={(e) => setCustomTexts((prev) => ({ ...prev, [k.key]: e.target.value }))}
                                                placeholder={k.default}
                                                rows={3}
                                                className="settings-input resize-none"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={customTexts[k.key] || ""}
                                                onChange={(e) => setCustomTexts((prev) => ({ ...prev, [k.key]: e.target.value }))}
                                                placeholder={k.default}
                                                className="settings-input"
                                            />
                                        )}
                                    </Field>
                                ))}
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Sticky save bar */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-10 mt-10 px-4 sm:px-6 lg:px-10 py-4 bg-white/80 backdrop-blur-xl border-t border-brand-lilac/10 flex items-center justify-between">
                <p className="text-xs text-brand-dark/30 hidden sm:block">Changes are saved across all tabs at once</p>
                <Button type="submit" disabled={saving}>
                    <span className="flex items-center gap-2">
                        <Save size={14} />
                        {saving ? "Saving..." : "Save All Settings"}
                    </span>
                </Button>
            </div>

            <style jsx>{`
                .settings-input {
                    width: 100%;
                    border: 1px solid rgba(200, 162, 200, 0.15);
                    border-radius: 0.625rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    transition: border-color 0.15s, box-shadow 0.15s;
                    background: #fafafa;
                }
                .settings-input:focus {
                    outline: none;
                    background: white;
                    border-color: rgba(182, 101, 210, 0.4);
                    box-shadow: 0 0 0 3px rgba(182, 101, 210, 0.08);
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </form>
    );
}

// ── Layout Components ──

function Card({ title, description, icon: Icon, children }: {
    title: string; description?: string; icon?: React.ElementType; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border border-brand-lilac/10 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-lilac/8 bg-neutral-50/50">
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} className="text-brand-purple" />}
                    <h3 className="text-sm font-semibold text-brand-dark">{title}</h3>
                </div>
                {description && <p className="text-xs text-brand-dark/40 mt-0.5 ml-0.5">{description}</p>}
            </div>
            <div className="px-5 py-5 space-y-5">
                {children}
            </div>
        </div>
    );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ElementType; children: React.ReactNode }) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-brand-dark/55 mb-1.5 uppercase tracking-wider">
                {Icon && <Icon size={12} className="text-brand-dark/35" />}
                {label}
            </label>
            {children}
        </div>
    );
}

function ImageUpload({ value, name, onChange, onUpload, uploadId, previewClass }: {
    value?: string; name: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadId: string; previewClass?: string;
}) {
    return (
        <div>
            <div className="flex gap-2">
                <input type="text" name={name} value={value || ""} onChange={onChange} className="settings-input flex-1" placeholder="https://..." />
                <input type="file" accept="image/*" onChange={onUpload} className="hidden" id={uploadId} />
                <label htmlFor={uploadId} className="shrink-0 cursor-pointer bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded-lg text-xs font-medium text-brand-dark/60 transition-colors flex items-center gap-1.5">
                    <ImageIcon size={12} />
                    Upload
                </label>
            </div>
            {value && (
                <div className="mt-2">
                    <img src={value} alt="Preview" className={previewClass || "h-10 object-contain"} />
                </div>
            )}
        </div>
    );
}

function SocialField({ label, icon: Icon, name, value, onChange, placeholder }: {
    label: string; icon: React.ElementType; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string;
}) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-brand-dark/55 mb-1.5 uppercase tracking-wider">
                <Icon size={12} className="text-brand-dark/35" />
                {label}
            </label>
            <input type="url" name={name} value={value} onChange={onChange} className="w-full border border-brand-lilac/15 rounded-[0.625rem] px-3 py-2 text-sm bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-brand-purple/10 focus:border-brand-purple/40 focus:bg-white transition-all" placeholder={placeholder} />
        </div>
    );
}
