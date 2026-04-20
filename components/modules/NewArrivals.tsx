"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Product } from "@/types";
import ProductCard from "@/components/modules/ProductCard";
import { ArrowRight } from "lucide-react";
import { getText } from "@/lib/textDefaults";

interface NewArrivalsProps {
    products: Product[];
    customTexts?: Record<string, string>;
}

export default function NewArrivals({ products, customTexts }: NewArrivalsProps) {
    return (
        <section className="py-24 md:py-32 px-6 max-w-[1400px] mx-auto scroll-mt-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-16 gap-4"
            >
                <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-brand-green mb-3 font-medium">
                        {getText(customTexts, "arrivals.eyebrow")}
                    </p>
                    <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-warm-cream tracking-tight">
                        {getText(customTexts, "arrivals.heading")}
                    </h2>
                </div>
                <Link
                    href="/shop?sort=newest"
                    className="group inline-flex items-center gap-2 text-sm text-warm-cream/50 hover:text-brand-green transition-colors duration-300"
                >
                    <span className="relative">
                        {getText(customTexts, "arrivals.link")}
                        <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-brand-green origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
                    </span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
            </motion.div>

            {/* Divider */}
            <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="h-[1px] bg-gradient-to-r from-transparent via-brand-green/20 to-transparent mb-16 origin-left"
            />

            {/* Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14">
                {products.map((product, i) => (
                    <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{
                            delay: i * 0.08,
                            duration: 0.5,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                    >
                        <ProductCard product={product} />
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
