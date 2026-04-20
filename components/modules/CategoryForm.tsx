"use client";

import { useState } from "react";
import type { Category } from "@/types";
import { createCategory, updateCategory } from "@/lib/queries";
import { uploadProductImage } from "@/lib/uploadImage";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
/* eslint-disable @next/next/no-img-element */
import { logAction } from "@/lib/auditClient";

interface CategoryFormProps {
    initialData?: Category | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function CategoryForm({ initialData, onSuccess, onCancel }: CategoryFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState({
        name: initialData?.name || "",
        slug: initialData?.slug || "",
        image: initialData?.image || "",
        description: initialData?.description || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        if (name === "name" && !initialData) {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
            setForm((prev) => ({ ...prev, slug: slug }));
        }
    };

    const [imageMode, setImageMode] = useState<"upload" | "url">("upload");

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Uploading image...");
        try {
            const url = await uploadProductImage(file);
            setForm((prev) => ({ ...prev, image: url }));
            toast.success("Image uploaded", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image", { id: toastId });
        }
    };

    const handleImageUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, image: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (initialData) {
                await updateCategory(initialData.id, form);
                logAction("update", "category", initialData.id, `Updated category: ${form.name}`);
                toast.success("Category updated");
            } else {
                await createCategory(form);
                logAction("create", "category", undefined, `Created category: ${form.name}`);
                toast.success("Category created");
            }
            onSuccess();
        } catch (error) {
            console.error("Error saving category:", error);
            toast.error("Failed to save category");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-warm-cream mb-1">Name</label>
                <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-transparent border border-warm-cream/30 rounded-sm focus:outline-none focus:border-brand-green"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-warm-cream mb-1">Slug</label>
                <input
                    type="text"
                    name="slug"
                    required
                    value={form.slug}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-transparent border border-warm-cream/30 rounded-sm focus:outline-none focus:border-brand-green font-mono text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-warm-cream mb-1">Category Image</label>
                <div className="flex gap-2 mb-3">
                    <button
                        type="button"
                        onClick={() => setImageMode("upload")}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${imageMode === "upload" ? "bg-brand-green text-white border-brand-green" : "border-warm-cream/30 text-warm-cream/60 hover:bg-warm-cream/10"}`}
                    >
                        Upload File
                    </button>
                    <button
                        type="button"
                        onClick={() => setImageMode("url")}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${imageMode === "url" ? "bg-brand-green text-white border-brand-green" : "border-warm-cream/30 text-warm-cream/60 hover:bg-warm-cream/10"}`}
                    >
                        Paste URL
                    </button>
                </div>
                <div className="flex items-start gap-4">
                    {form.image && (
                        <div className="relative w-24 h-24 border rounded overflow-hidden flex-shrink-0">
                            <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex-1">
                        {imageMode === "upload" ? (
                            <>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-warm-cream/10 file:text-brand-green hover:file:bg-warm-cream/20"
                                />
                                <p className="mt-1 text-xs text-warm-cream/40">Upload an image file for this category.</p>
                            </>
                        ) : (
                            <>
                                <input
                                    type="url"
                                    value={form.image}
                                    onChange={handleImageUrl}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2 bg-transparent border border-warm-cream/30 rounded-sm focus:outline-none focus:border-brand-green text-sm"
                                />
                                <p className="mt-1 text-xs text-warm-cream/40">Paste a direct link to the image.</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-warm-cream mb-1">Description</label>
                <textarea
                    name="description"
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-transparent border border-warm-cream/30 rounded-sm focus:outline-none focus:border-brand-green"
                />
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : initialData ? "Update Category" : "Create Category"}
                </Button>
            </div>
        </form>
    );
}
