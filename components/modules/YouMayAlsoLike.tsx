"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/types";
import ProductCard from "@/components/modules/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";

interface YouMayAlsoLikeProps {
    currentProduct: Product;
    allProducts: Product[];
}

export default function YouMayAlsoLike({ currentProduct, allProducts }: YouMayAlsoLikeProps) {
    const related = allProducts
        .filter((p) =>
            p.id !== currentProduct.id &&
            (p.category === currentProduct.category || p.brand === currentProduct.brand)
        )
        .slice(0, 4);

    // Fallback: if not enough related products, pad with other products
    const extras = related.length < 4
        ? allProducts
            .filter((p) => p.id !== currentProduct.id && !related.find((r) => r.id === p.id))
            .slice(0, 4 - related.length)
        : [];

    const recommendations = [...related, ...extras];

    if (recommendations.length === 0) return null;

    return (
        <section className="py-20 md:py-28 px-6 max-w-[1400px] mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-green mb-3 font-medium">
                            Curated For You
                        </p>
                        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-warm-cream tracking-tight">
                            You May Also Like
                        </h2>
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-brand-purple/20 via-brand-lilac/15 to-transparent mb-12" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {recommendations.map((product, i) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                        >
                            <ProductCard product={product} />
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </section>
    );
}
