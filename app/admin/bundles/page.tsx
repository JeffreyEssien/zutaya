"use client";

import { useState, useEffect } from "react";
import type { ZutayaPackage, ZutayaPackageItem, Product, MediaItem } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import MediaPicker from "@/components/modules/MediaPicker";
import SafeImage from "@/components/ui/SafeImage";
import { Package, Plus, Trash2, GripVertical, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type LineDraft = ZutayaPackageItem;

interface FormState {
    name: string;
    tagline: string;
    description: string;
    price: number;
    imageUrl: string;
    isActive: boolean;
    sortOrder: number;
    items: LineDraft[];
}

const EMPTY_FORM: FormState = {
    name: "",
    tagline: "",
    description: "",
    price: 0,
    imageUrl: "",
    isActive: true,
    sortOrder: 0,
    items: [],
};

export default function AdminPackagesPage() {
    const [packages, setPackages] = useState<ZutayaPackage[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ZutayaPackage | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    const fetchData = async () => {
        const [pkgRes, prodRes] = await Promise.all([
            fetch("/api/bundles").then((r) => r.json()).catch(() => []),
            fetch("/api/products").then((r) => r.json()).catch(() => []),
        ]);
        setPackages(Array.isArray(pkgRes) ? pkgRes : []);
        setProducts(Array.isArray(prodRes) ? prodRes : []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditing(null);
        setShowForm(false);
    };

    const handleNew = () => {
        setForm({ ...EMPTY_FORM, sortOrder: packages.length });
        setEditing(null);
        setShowForm(true);
    };

    const handleEdit = (pkg: ZutayaPackage) => {
        setEditing(pkg);
        setForm({
            name: pkg.name,
            tagline: pkg.tagline || "",
            description: pkg.description || "",
            price: pkg.price,
            imageUrl: pkg.imageUrl || "",
            isActive: pkg.isActive,
            sortOrder: pkg.sortOrder,
            items: pkg.items.map((i) => ({ ...i })),
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ── Content-line editing ──
    const addLine = () => {
        setForm((p) => ({
            ...p,
            items: [...p.items, { productId: null, quantity: 1, label: "", variantName: null, inventoryItemId: null, sortOrder: p.items.length }],
        }));
    };

    const updateLine = (idx: number, patch: Partial<LineDraft>) => {
        setForm((p) => ({
            ...p,
            items: p.items.map((line, i) => (i === idx ? { ...line, ...patch } : line)),
        }));
    };

    const onPickProduct = (idx: number, productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product) {
            updateLine(idx, { productId: null, productName: undefined, inventoryItemId: null, variantName: null });
            return;
        }
        updateLine(idx, {
            productId: product.id,
            productName: product.name,
            inventoryItemId: product.inventoryId || null,
            // Reset variant; if product has variants, admin picks one next
            variantName: null,
            label: form.items[idx]?.label || product.name,
        });
    };

    const removeLine = (idx: number) => {
        setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Package name is required");
        if (form.price <= 0) return toast.error("Price must be greater than 0");
        const validItems = form.items.filter((i) => i.productId);
        if (validItems.length === 0) return toast.error("Add at least one content line linked to a product");

        setSaving(true);
        const payload = {
            name: form.name.trim(),
            tagline: form.tagline.trim() || undefined,
            description: form.description.trim() || undefined,
            price: Number(form.price),
            imageUrl: form.imageUrl || undefined,
            isActive: form.isActive,
            sortOrder: form.sortOrder,
            items: validItems.map((i, idx) => ({
                productId: i.productId,
                productName: i.productName,
                variantName: i.variantName || null,
                inventoryItemId: i.inventoryItemId || null,
                quantity: Math.max(1, Number(i.quantity) || 1),
                label: i.label || i.productName,
                sortOrder: idx,
            })),
        };

        try {
            const res = editing
                ? await fetch("/api/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...payload }) })
                : await fetch("/api/bundles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Save failed");
            }
            toast.success(editing ? "Package updated" : "Package created");
            resetForm();
            fetchData();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this package? This cannot be undone.")) return;
        await fetch(`/api/bundles?id=${id}`, { method: "DELETE" });
        toast.success("Package deleted");
        fetchData();
    };

    const toggleActive = async (pkg: ZutayaPackage) => {
        await fetch("/api/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }) });
        fetchData();
    };

    if (loading) {
        return <div className="p-8 text-center text-warm-cream/40">Loading packages…</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-warm-cream flex items-center gap-2">
                        <Package size={22} className="text-brand-green" /> Zútaya Packages
                    </h1>
                    <p className="text-sm text-warm-cream/40 mt-1">Curated meat boxes sold at a flat price. Buying one deducts stock from each linked product.</p>
                </div>
                {!showForm && (
                    <button onClick={handleNew} className="bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-red/90 flex items-center gap-1.5">
                        <Plus size={16} /> New Package
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-raised rounded-xl p-6 shadow-sm border border-warm-tan/20 mb-8 space-y-5">
                    <h2 className="font-semibold text-warm-cream text-lg">{editing ? "Edit Package" : "New Package"}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/50 mb-1">Name *</label>
                            <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Zútaya Package" className="w-full bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/50 mb-1">Price (₦) *</label>
                            <input type="number" value={form.price || ""} onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))} min={0} required placeholder="45000" className="w-full bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/50 mb-1">Tagline</label>
                            <input type="text" value={form.tagline} onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} placeholder="Family favourite" className="w-full bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/50 mb-1">Sort Order</label>
                            <input type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} className="w-full bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-warm-cream/50 mb-1">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-3 py-2 text-sm" />
                    </div>

                    {/* Image */}
                    <div>
                        <label className="block text-sm font-medium text-warm-cream/50 mb-1">Package Image</label>
                        <div className="flex items-center gap-3">
                            <div className="relative h-20 w-24 rounded-lg overflow-hidden bg-warm-cream/5 border border-warm-tan/30 shrink-0">
                                {form.imageUrl ? (
                                    <SafeImage src={form.imageUrl} alt="Package" fill className="object-cover" sizes="96px" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-warm-cream/25"><ImageIcon size={20} /></div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setPickerOpen(true)} className="px-3 py-1.5 rounded-lg text-sm border border-warm-tan/30 hover:bg-warm-cream/5">Choose image</button>
                                {form.imageUrl && (
                                    <button type="button" onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))} className="px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50">Remove</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content lines */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-warm-cream/50">Contents *</label>
                            <button type="button" onClick={addLine} className="text-brand-red text-sm font-medium flex items-center gap-1 hover:underline"><Plus size={14} /> Add item</button>
                        </div>
                        <div className="space-y-2">
                            {form.items.length === 0 && (
                                <p className="text-xs text-warm-cream/30 italic py-2">No items yet. Add the products this box contains.</p>
                            )}
                            {form.items.map((line, idx) => {
                                const product = products.find((p) => p.id === line.productId);
                                const variants = product?.variants || [];
                                return (
                                    <div key={idx} className="flex flex-wrap items-center gap-2 bg-raised rounded-lg p-2 border border-warm-tan/15">
                                        <GripVertical size={14} className="text-warm-cream/20 shrink-0" />
                                        {/* Product */}
                                        <select value={line.productId || ""} onChange={(e) => onPickProduct(idx, e.target.value)} className="bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-2 py-1.5 text-sm min-w-[160px] flex-1">
                                            <option value="">— Select product —</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        {/* Variant (if any) */}
                                        {variants.length > 0 && (
                                            <select value={line.variantName || ""} onChange={(e) => updateLine(idx, { variantName: e.target.value || null })} className="bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-2 py-1.5 text-sm">
                                                <option value="">Main stock</option>
                                                {variants.map((v) => (
                                                    <option key={v.name} value={v.name}>{v.name}</option>
                                                ))}
                                            </select>
                                        )}
                                        {/* Qty */}
                                        <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} className="w-16 bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-2 py-1.5 text-sm" title="Quantity deducted from stock" />
                                        {/* Display label */}
                                        <input type="text" value={line.label || ""} onChange={(e) => updateLine(idx, { label: e.target.value })} placeholder="Display label e.g. 1kg goatmeat" className="bg-black/40 text-warm-cream placeholder:text-warm-cream/30 border border-warm-tan/30 rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[140px]" />
                                        <button type="button" onClick={() => removeLine(idx)} className="p-1.5 text-warm-cream/30 hover:text-red-500"><Trash2 size={15} /></button>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-warm-cream/30 mt-2">Qty is the number of units deducted from each product's stock per box. The label is what customers see (e.g. "1kg goatmeat").</p>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                        Active (visible on storefront)
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving} className="bg-brand-red text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-brand-red/90 disabled:opacity-50">
                            {saving ? "Saving…" : editing ? "Update Package" : "Create Package"}
                        </button>
                        <button type="button" onClick={resetForm} className="px-6 py-2 rounded-lg text-sm text-warm-cream/50 border border-warm-tan/30 hover:bg-warm-cream/5">Cancel</button>
                    </div>
                </form>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                    <div key={pkg.id} className="bg-raised rounded-xl border border-warm-tan/20 overflow-hidden flex">
                        <div className="relative w-28 shrink-0 bg-warm-cream/5">
                            {pkg.imageUrl ? (
                                <SafeImage src={pkg.imageUrl} alt={pkg.name} fill className="object-cover" sizes="112px" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-warm-cream/20"><Package size={24} /></div>
                            )}
                        </div>
                        <div className="flex-1 p-3 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-semibold text-warm-cream truncate">{pkg.name}</p>
                                    <p className="text-brand-red font-bold text-sm">{formatCurrency(pkg.price)}</p>
                                </div>
                                <button onClick={() => toggleActive(pkg)} className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${pkg.isActive ? "bg-brand-green/10 text-brand-green" : "bg-warm-cream/10 text-warm-cream/40"}`}>
                                    {pkg.isActive ? "Active" : "Hidden"}
                                </button>
                            </div>
                            <p className="text-[11px] text-warm-cream/40 mt-1 line-clamp-2">
                                {pkg.items.map((i) => i.label || i.productName).join(", ") || "No items"}
                            </p>
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => handleEdit(pkg)} className="text-brand-red text-xs font-medium hover:underline">Edit</button>
                                <button onClick={() => handleDelete(pkg.id)} className="text-red-500 text-xs font-medium hover:underline">Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
                {packages.length === 0 && (
                    <div className="col-span-full py-12 text-center text-warm-cream/40 border border-dashed border-warm-tan/20 rounded-xl">
                        No packages yet. Create your first Zútaya Package.
                    </div>
                )}
            </div>

            <MediaPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                filterType="image"
                title="Choose package image"
                onSelect={(items: MediaItem[]) => {
                    if (items[0]?.url) setForm((p) => ({ ...p, imageUrl: items[0].url }));
                    setPickerOpen(false);
                }}
            />
        </div>
    );
}
