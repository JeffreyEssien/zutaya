"use client";

import { useState, useEffect } from "react";
import type { Category } from "@/types";
import { getCategories, deleteCategory } from "@/lib/queries";
import Button from "@/components/ui/Button";
import CategoryForm from "@/components/modules/CategoryForm";
import Image from "next/image";

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;
        try {
            await deleteCategory(id);
            await fetchCategories();
        } catch (error) {
            alert("Failed to delete category.");
        }
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setIsFormOpen(true);
    };

    const handleFormSuccess = async () => {
        setIsFormOpen(false);
        setEditingCategory(null);
        await fetchCategories();
    };

    if (isFormOpen) {
        return (
            <div className="max-w-2xl mx-auto">
                <h1 className="font-serif text-2xl text-warm-cream mb-8">
                    {editingCategory ? "Edit Category" : "Add New Category"}
                </h1>
                <div className="bg-white/[0.04] p-6 rounded-lg shadow-sm border border-warm-cream/20">
                    <CategoryForm
                        initialData={editingCategory}
                        onSuccess={handleFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-serif text-2xl sm:text-3xl text-warm-cream">Categories</h1>
                <Button onClick={handleCreate}>+ Add Category</Button>
            </div>

            {isLoading ? (
                <p>Loading categories...</p>
            ) : categories.length === 0 ? (
                <div className="text-center py-20 bg-[#111] rounded-lg">
                    <p className="text-warm-cream/50 mb-4">No categories found.</p>
                    <Button onClick={handleCreate}>Create Your First Category</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categories.map((cat) => (
                        <div key={cat.id} className="bg-white/[0.04] rounded-lg shadow-sm border border-warm-cream/20 overflow-hidden group">
                            <div className="relative h-48 bg-neutral-100">
                                {cat.image ? (
                                    <Image
                                        src={cat.image}
                                        alt={cat.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-warm-cream/20 text-4xl font-serif">
                                        {cat.name[0]}
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-serif text-lg text-warm-cream mb-1">{cat.name}</h3>
                                <p className="text-xs text-warm-cream/50 font-mono mb-4">/{cat.slug}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(cat)}
                                        className="text-sm font-medium text-brand-green hover:underline"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="text-sm font-medium text-red-500 hover:underline ml-auto"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
