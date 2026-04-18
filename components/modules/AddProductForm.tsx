"use client";

import { useState, useEffect } from "react";
import type { Product, InventoryItem, Category, PrepOption } from "@/types";
import Button from "@/components/ui/Button";
import { uploadProductImage } from "@/lib/uploadImage";
import { createProduct, updateProduct, createInventoryItem, getInventoryItems, getCategories } from "@/lib/queries";
import { revalidateShop } from "@/app/actions";
import RichTextEditor from "@/components/modules/RichTextEditor";
import { toast } from "sonner";
import { logAction } from "@/lib/auditClient";

export default function AddProductForm({ initialData }: { initialData?: Product | null }) {
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>(initialData?.images || []);
    const [uploading, setUploading] = useState(false);
    const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
    const [urlInput, setUrlInput] = useState("");

    // Mode: 'new' = create inv + product, 'existing' = link to inv
    const [mode, setMode] = useState<"new" | "existing">(initialData ? "new" : "new");

    // Inventory List for "Select Existing"
    const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
    const [selectedInvItem, setSelectedInvItem] = useState<InventoryItem | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        getCategories().then(cats => setCategories(cats)).catch(console.error);
        if (mode === "existing") {
            getInventoryItems().then(items => setAvailableInventory(items));
        }
    }, [mode]);

    const [form, setForm] = useState({
        title: initialData?.name || "",
        description: initialData?.description || "",
        price: initialData?.price.toString() || "",
        stock: initialData?.stock.toString() || "",
        category: initialData?.category || "",
        priceUnit: initialData?.priceUnit || "per_kg",
        cutType: initialData?.cutType || "",
        storageType: initialData?.storageType || "fresh",
        minWeightKg: initialData?.minWeightKg?.toString() || "",
    });

    const [prepOptions, setPrepOptions] = useState<PrepOption[]>(
        initialData?.prepOptions || []
    );

    // New Inventory Fields
    const [invForm, setInvForm] = useState({
        sku: "",
        costPrice: "",
        reorderLevel: "5",
        supplier: ""
    });

    const [variants, setVariants] = useState<Product["variants"]>(initialData?.variants || []);

    const variantStockTotal: number | null = variants.length > 0
        ? variants.reduce((sum: number, v: Product["variants"][number]) => sum + (v.stock || 0), 0)
        : null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleInvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInvForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectInventory = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const itemId = e.target.value;
        const item = availableInventory.find(i => i.id === itemId);
        if (item) {
            setSelectedInvItem(item);
            // Auto-fill product fields
            setForm(prev => ({
                ...prev,
                title: item.name,
                price: item.sellingPrice.toString(),
                stock: item.stock.toString(),
            }));
        } else {
            setSelectedInvItem(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setImages((prev) => [...prev, ...newFiles]);
            setUploading(true);
            try {
                const uploadPromises = newFiles.map(file => uploadProductImage(file));
                const urls = await Promise.all(uploadPromises);
                setImageUrls((prev) => [...prev, ...urls]);
            } catch (error) {
                console.error("Upload failed", error);
                toast.error("Failed to upload images");
            } finally {
                setUploading(false);
            }
        }
    };

    const handleAddImageUrl = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;
        try {
            new URL(trimmed);
            setImageUrls((prev) => [...prev, trimmed]);
            setUrlInput("");
        } catch {
            toast.error("Please enter a valid URL");
        }
    };

    const handleRemoveImage = (idx: number) => {
        setImageUrls((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Images are optional — admin can add them later

        setLoading(true);
        try {
            const stockToSave = variantStockTotal !== null ? variantStockTotal : parseInt(form.stock);

        if (initialData) {
                // Edit (Standard Update)
                await updateProduct(initialData.id, {
                    name: form.title,
                    description: form.description,
                    price: parseFloat(form.price),
                    stock: stockToSave,
                    category: form.category,
                    images: imageUrls,
                    variants: variants,
                    priceUnit: form.priceUnit,
                    cutType: form.cutType || null,
                    storageType: form.storageType || "fresh",
                    prepOptions: prepOptions,
                    minWeightKg: form.minWeightKg ? parseFloat(form.minWeightKg) : null,
                });
                logAction("update", "product", initialData.id, `Updated product: ${form.title}`);
                await revalidateShop();
                toast.success("Product updated!");
            } else {
                // Create Logic
                let inventoryId = undefined;

                if (mode === "new") {
                    // 1. Create Inventory Item
                    inventoryId = await createInventoryItem({
                        sku: invForm.sku || form.title.toUpperCase().slice(0, 3) + "-" + Date.now().toString().slice(-4),
                        name: form.title,
                        costPrice: Number(invForm.costPrice),
                        sellingPrice: Number(form.price),
                        stock: stockToSave,
                        reorderLevel: Number(invForm.reorderLevel),
                        supplier: invForm.supplier
                    });
                } else {
                    // 2. Use Existing
                    if (!selectedInvItem) {
                        toast.error("Please select an inventory item");
                        setLoading(false);
                        return;
                    }
                    inventoryId = selectedInvItem.id;
                }

                // 3. Create Product linked to Inventory
                await createProduct({
                    name: form.title,
                    description: form.description,
                    price: parseFloat(form.price),
                    stock: stockToSave,
                    category: form.category,
                    images: imageUrls,
                    variants: variants,
                    inventoryId: inventoryId,
                    priceUnit: form.priceUnit,
                    cutType: form.cutType || null,
                    storageType: form.storageType || "fresh",
                    prepOptions: prepOptions,
                    minWeightKg: form.minWeightKg ? parseFloat(form.minWeightKg) : null,
                });
                logAction("create", "product", undefined, `Created product: ${form.title}`);
                await revalidateShop();

                toast.success("Product created!");
            }
            window.location.reload();
        } catch (error: any) {
            console.error("Product save error:", error);
            const msg = error?.message || error?.details || JSON.stringify(error) || "Unknown error";
            toast.error(`Failed: ${msg}`);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-6">
            {!initialData && (
                <div className="flex gap-4 border-b border-brand-lilac/20 pb-4">
                    <button onClick={() => setMode("new")} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${mode === "new" ? "border-brand-purple text-brand-purple" : "border-transparent text-gray-500"}`}>
                        Create New (Full)
                    </button>
                    <button onClick={() => setMode("existing")} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${mode === "existing" ? "border-brand-purple text-brand-purple" : "border-transparent text-gray-500"}`}>
                        Select from Inventory
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-brand-lilac/20 p-6 mb-8 space-y-6 animate-slideUp">
                <h2 className="font-serif text-lg text-brand-dark mb-4">{initialData ? "Edit Product" : (mode === "new" ? "Create New Item & Product" : "Publish Inventory Item")}</h2>

                {mode === "existing" && !initialData && (
                    <div className="bg-brand-lilac/5 p-4 rounded-md border border-brand-lilac/10">
                        <label className="block text-sm font-medium text-brand-dark mb-2">Select Inventory Item</label>
                        <select
                            className="w-full px-3 py-2 border border-brand-lilac/30 rounded focus:border-brand-purple"
                            onChange={handleSelectInventory}
                            value={selectedInvItem?.id || ""}
                        >
                            <option value="">-- Search / Select Item --</option>
                            {availableInventory.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} (SKU: {item.sku}) - {item.stock} in stock
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Selecting an item will auto-fill Name, Price, and Stock.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Basic Fields */}
                    <InputField label="Product Title" name="title" value={form.title} onChange={handleChange} required />
                    <SelectField label="Category" name="category" value={form.category} onChange={handleChange} required options={categories} />
                </div>

                {/* Financials / Inventory Data */}
                <div className="border border-brand-lilac/20 rounded p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-brand-dark mb-3">Pricing & Inventory</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Cost Price only for New Mode or if we want to show it in existing? */}
                        {mode === "new" && !initialData && (
                            <InputField label="Cost Price (₦)" name="costPrice" type="number" value={invForm.costPrice} onChange={handleInvChange} required />
                        )}

                        <InputField
                            label={`Selling Price (₦) ${mode === "existing" ? "(Managed in Inventory)" : ""}`}
                            name="price"
                            type="number"
                            value={form.price}
                            onChange={handleChange}
                            required
                            readOnly={mode === "existing"}
                            className={mode === "existing" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
                        />

                        <InputField
                            label={`Stock Quantity${mode === "existing" ? " (Managed in Inventory)" : variantStockTotal !== null ? " (Sum of variants)" : ""}`}
                            name="stock"
                            type="number"
                            value={variantStockTotal !== null ? variantStockTotal.toString() : form.stock}
                            onChange={handleChange}
                            required
                            readOnly={mode === "existing" || variantStockTotal !== null}
                            className={mode === "existing" || variantStockTotal !== null ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
                        />
                    </div>
                    {/* Margin Calc Visual */}
                    {mode === "new" && invForm.costPrice && form.price && (
                        <div className="mt-2 text-xs text-gray-500">
                            Estimated Margin: <strong className="text-green-600">
                                {(((Number(form.price) - Number(invForm.costPrice)) / Number(form.price)) * 100).toFixed(1)}%
                            </strong>
                        </div>
                    )}

                    {mode === "new" && !initialData && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200/50">
                            <InputField label="SKU (Optional)" name="sku" value={invForm.sku} onChange={handleInvChange} />
                            <InputField label="Supplier (Optional)" name="supplier" value={invForm.supplier} onChange={handleInvChange} />
                        </div>
                    )}
                </div>

                {/* Meat Commerce Fields */}
                <div className="border border-brand-lilac/20 rounded p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-brand-dark mb-3">Meat Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="priceUnit" className="block text-xs text-brand-dark/60 mb-1">Price Unit</label>
                            <select
                                id="priceUnit"
                                name="priceUnit"
                                value={form.priceUnit}
                                onChange={handleChange}
                                className="w-full border border-brand-lilac/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                            >
                                <option value="per_kg">Per KG</option>
                                <option value="per_pack">Per Pack</option>
                                <option value="per_piece">Per Piece</option>
                                <option value="whole">Whole</option>
                            </select>
                        </div>
                        <InputField label="Cut Type" name="cutType" value={form.cutType} onChange={handleChange} />
                        <div>
                            <label htmlFor="storageType" className="block text-xs text-brand-dark/60 mb-1">Storage Type</label>
                            <select
                                id="storageType"
                                name="storageType"
                                value={form.storageType}
                                onChange={handleChange}
                                className="w-full border border-brand-lilac/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                            >
                                <option value="fresh">Fresh</option>
                                <option value="chilled">Chilled</option>
                                <option value="frozen">Frozen</option>
                            </select>
                        </div>
                    </div>
                    {form.priceUnit === "per_kg" && (
                        <div className="mt-4">
                            <InputField label="Min Weight (kg)" name="minWeightKg" type="number" value={form.minWeightKg} onChange={handleChange} />
                        </div>
                    )}

                    {/* Prep Options */}
                    <div className="mt-4 pt-4 border-t border-gray-200/50">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs text-brand-dark/60 font-medium">Prep Options</label>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPrepOptions([...prepOptions, { id: crypto.randomUUID(), label: "", extraFee: 0 }])}
                            >
                                + Add Option
                            </Button>
                        </div>
                        {prepOptions.length === 0 && (
                            <button
                                type="button"
                                onClick={() => setPrepOptions([
                                    { id: crypto.randomUUID(), label: "Debone", extraFee: 500 },
                                    { id: crypto.randomUUID(), label: "Dice", extraFee: 300 },
                                    { id: crypto.randomUUID(), label: "Mince", extraFee: 400 },
                                    { id: crypto.randomUUID(), label: "Season", extraFee: 600 },
                                ])}
                                className="text-xs text-brand-purple hover:underline cursor-pointer"
                            >
                                Seed default options (Debone, Dice, Mince, Season)
                            </button>
                        )}
                        {prepOptions.map((opt, idx) => (
                            <div key={opt.id} className="flex gap-2 items-end bg-white p-3 rounded-md mb-2">
                                <div className="flex-1">
                                    <label className="text-xs text-brand-dark/60">Label</label>
                                    <input
                                        type="text"
                                        value={opt.label}
                                        onChange={(e) => {
                                            const next = [...prepOptions];
                                            next[idx] = { ...next[idx], label: e.target.value };
                                            setPrepOptions(next);
                                        }}
                                        className="w-full border border-brand-lilac/20 rounded-md px-2 py-1 text-sm"
                                        placeholder="e.g. Debone"
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="text-xs text-brand-dark/60">Extra Fee (₦)</label>
                                    <input
                                        type="number"
                                        value={opt.extraFee}
                                        onChange={(e) => {
                                            const next = [...prepOptions];
                                            next[idx] = { ...next[idx], extraFee: parseInt(e.target.value) || 0 };
                                            setPrepOptions(next);
                                        }}
                                        className="w-full border border-brand-lilac/20 rounded-md px-2 py-1 text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPrepOptions(prepOptions.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-700 text-xs pb-2"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-brand-dark mb-1">Description</label>
                    <RichTextEditor
                        value={form.description}
                        onChange={(content: string) => setForm((prev) => ({ ...prev, description: content }))}
                    />
                </div>

                {/* Variants Section */}
                <div className="space-y-3 border-t border-brand-lilac/20 pt-4">
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-brand-dark">Variants (Optional)</label>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setVariants([...variants, { name: "", stock: 0 }])}
                        >
                            + Add Variant
                        </Button>
                    </div>
                    {variants.map((variant, idx) => (
                        <div key={idx} className="flex gap-2 items-end bg-brand-lilac/5 p-3 rounded-md">
                            <div className="flex-1">
                                <label className="text-xs text-brand-dark/60">Name (e.g. Red, XL)</label>
                                <input
                                    type="text"
                                    value={variant.name}
                                    onChange={(e) => {
                                        const newVariants = [...variants];
                                        newVariants[idx].name = e.target.value;
                                        setVariants(newVariants);
                                    }}
                                    className="w-full border border-brand-lilac/20 rounded-md px-2 py-1 text-sm"
                                    placeholder="Variant Name"
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-brand-dark/60">Stock</label>
                                <input
                                    type="number"
                                    value={variant.stock || 0}
                                    onChange={(e) => {
                                        const newVariants = [...variants];
                                        newVariants[idx].stock = parseInt(e.target.value) || 0;
                                        setVariants(newVariants);
                                    }}
                                    className="w-full border border-brand-lilac/20 rounded-md px-2 py-1 text-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 text-xs pb-2"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                {/* Images */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs text-brand-dark/60">Product Images</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setImageInputMode("upload")}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${imageInputMode === "upload" ? "bg-brand-purple text-white border-brand-purple" : "border-brand-lilac/30 text-brand-dark/60 hover:bg-brand-lilac/10"}`}
                            >
                                Upload File
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageInputMode("url")}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${imageInputMode === "url" ? "bg-brand-purple text-white border-brand-purple" : "border-brand-lilac/30 text-brand-dark/60 hover:bg-brand-lilac/10"}`}
                            >
                                Paste URL
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
                        {imageUrls.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-brand-lilac/20 group">
                                <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(idx)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        {uploading && (
                            <div className="aspect-square rounded-md bg-brand-lilac/5 flex items-center justify-center border border-brand-lilac/20">
                                <span className="text-xs text-brand-dark/50 animate-pulse">Uploading...</span>
                            </div>
                        )}
                    </div>
                    {imageInputMode === "upload" ? (
                        <div className="border-2 border-dashed border-brand-lilac/30 rounded-md p-8 text-center hover:bg-brand-lilac/5 transition-colors relative">
                            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="space-y-1 pointer-events-none">
                                <p className="text-sm text-brand-dark/60 font-medium">Click or drag images here</p>
                                <p className="text-xs text-brand-dark/40">JPG, PNG, WEBP</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImageUrl(); } }}
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 border border-brand-lilac/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                            />
                            <Button type="button" variant="outline" onClick={handleAddImageUrl}>
                                Add
                            </Button>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <Button type="submit" disabled={loading || uploading}>
                        {loading ? "Saving..." : (initialData ? "Update Product" : "Save Product")}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function InputField({ label, name, type = "text", value, onChange, required, readOnly, className }: {
    label: string; name: string; type?: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    readOnly?: boolean;
    className?: string;
}) {
    return (
        <div>
            <label htmlFor={name} className="block text-xs text-brand-dark/60 mb-1">{label}</label>
            <input
                id={name} name={name} type={type} value={value} onChange={onChange} required={required} readOnly={readOnly}
                className={`w-full border border-brand-lilac/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30 ${className || ""}`}
            />
        </div>
    );
}

function SelectField({ label, name, value, onChange, required, options }: {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    required?: boolean;
    options: Category[];
}) {
    return (
        <div>
            <label htmlFor={name} className="block text-xs text-brand-dark/60 mb-1">{label}</label>
            <select
                id={name} name={name} value={value} onChange={onChange} required={required}
                className="w-full border border-brand-lilac/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
            >
                <option value="">Select category</option>
                {options.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
            </select>
        </div>
    );
}
