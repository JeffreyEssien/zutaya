"use client";


import { useState } from "react";
import type { Product } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import AddProductForm from "@/components/modules/AddProductForm";
import { StorageBadge } from "@/components/ui/StorageBadge";
import { deleteProduct } from "@/lib/queries";
import { revalidateShop } from "@/app/actions";
import { logAction } from "@/lib/auditClient";

interface AdminProductsContentProps {
    products: Product[];
}

export default function AdminProductsContent({ products }: AdminProductsContentProps) {
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const toggleForm = () => {
        if (showForm) {
            setEditingProduct(null);
        }
        setShowForm(!showForm);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            try {
                await deleteProduct(id);
                logAction("delete", "product", id, `Deleted product`);
                await revalidateShop();
                alert("Product deleted successfully");
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert("Failed to delete product");
            }
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <h1 className="font-serif text-2xl sm:text-3xl text-brand-dark">Products</h1>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 sm:w-64 px-4 py-2 rounded-lg border border-brand-lilac/20 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                    />
                    <Button onClick={toggleForm}>
                        {showForm ? "Close" : "+ Add Product"}
                    </Button>
                </div>
            </div>
            {showForm && (
                <AddProductForm
                    key={editingProduct ? editingProduct.id : "new"}
                    initialData={editingProduct}
                />
            )}

            {/* Desktop table */}
            <div className="hidden md:block">
                <div className="bg-white rounded-lg border border-brand-lilac/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-brand-lilac/20 bg-brand-lilac/5">
                                    <th className="text-left px-4 py-3 font-medium text-brand-dark/60">Product</th>
                                    <th className="text-left px-4 py-3 font-medium text-brand-dark/60">Price</th>
                                    <th className="text-left px-4 py-3 font-medium text-brand-dark/60">Stock</th>
                                    <th className="text-left px-4 py-3 font-medium text-brand-dark/60">Category</th>
                                    <th className="text-left px-4 py-3 font-medium text-brand-dark/60">Storage</th>
                                    <th className="text-left px-4 py-3 font-medium text-brand-dark/60">Cut</th>
                                    <th className="text-right px-4 py-3 font-medium text-brand-dark/60">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-lilac/10">
                                {filteredProducts.map((p) => (
                                    <tr key={p.id} className={cn(p.stock <= LOW_STOCK_THRESHOLD && "bg-red-50/50")}>
                                        <td className="px-4 py-3 font-medium text-brand-dark">{p.name}</td>
                                        <td className="px-4 py-3 text-brand-dark/70">{formatCurrency(p.price)}</td>
                                        <td className="px-4 py-3">
                                            <StockBadge stock={p.stock} />
                                        </td>
                                        <td className="px-4 py-3 text-brand-dark/70 capitalize">{p.category}</td>
                                        <td className="px-4 py-3">
                                            {p.storageType && <StorageBadge type={p.storageType} />}
                                        </td>
                                        <td className="px-4 py-3 text-brand-dark/70 text-xs capitalize">{p.cutType || "—"}</td>
                                        <td className="px-4 py-3 text-right space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(p)}
                                                className="text-brand-purple hover:underline text-xs cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(p.id)}
                                                className="text-red-600 hover:underline text-xs cursor-pointer"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-brand-dark/50">
                                            No products found matching "{searchQuery}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {filteredProducts.map((p) => (
                    <div
                        key={p.id}
                        className={cn(
                            "bg-white rounded-lg border p-4",
                            p.stock <= LOW_STOCK_THRESHOLD ? "border-red-200 bg-red-50/30" : "border-brand-lilac/20",
                        )}
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-medium text-brand-dark">{p.name}</p>
                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleEdit(p)}
                                    className="text-brand-purple hover:underline text-xs cursor-pointer"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(p.id)}
                                    className="text-red-600 hover:underline text-xs cursor-pointer"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <span className="text-brand-dark/70">{formatCurrency(p.price)}</span>
                            <span className="capitalize text-brand-dark/50">{p.category}</span>
                            <StockBadge stock={p.stock} />
                            {p.storageType && <StorageBadge type={p.storageType} />}
                            {p.cutType && <span className="text-brand-dark/50 capitalize">{p.cutType}</span>}
                        </div>
                    </div>
                ))}
                {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-brand-dark/50 text-sm">
                        No products found
                    </div>
                )}
            </div>
        </div>
    );
}

function StockBadge({ stock }: { stock: number }) {
    if (stock <= LOW_STOCK_THRESHOLD) {
        return <span className="text-red-600 font-medium text-xs">{stock} left</span>;
    }
    return <span className="text-emerald-600 text-xs">{stock} in stock</span>;
}
