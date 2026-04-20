"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Category } from "@/types";
import CategoryTile from "@/components/modules/CategoryTile";
import { ArrowRight } from "lucide-react";
import { getText } from "@/lib/textDefaults";

interface ShopByCategoryProps {
    categories: Category[];
    customTexts?: Record<string, string>;
}

export default function ShopByCategory({ categories, customTexts }: ShopByCategoryProps) {
    return (
        <section className="py-24 md:py-32 px-6 relative overflow-hidden scroll-mt-20">
            {/* Background accent */}
            <div className="absolute inset-0 bg-gradient-to-b from-brand-lilac/[0.03] via-brand-lilac/[0.06] to-brand-lilac/[0.03]" />
            <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-b from-brand-purple/[0.04] to-transparent rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="max-w-[1400px] mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-16 gap-4"
                >
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-green mb-3 font-medium">{getText(customTexts, "categories.eyebrow")}</p>
                        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-warm-cream tracking-tight">
                            {getText(customTexts, "categories.heading")}
                        </h2>
                    </div>
                    <Link
                        href="/shop"
                        className="group inline-flex items-center gap-2 text-sm text-warm-cream/50 hover:text-brand-green transition-colors duration-300"
                    >
                        <span className="relative">
                            {getText(customTexts, "categories.link")}
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
                    className="h-[1px] bg-gradient-to-r from-transparent via-brand-lilac/40 to-transparent mb-16 origin-left"
                />

                {/* Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {categories.map((cat, i) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{
                                delay: i * 0.1,
                                duration: 0.5,
                                ease: [0.16, 1, 0.3, 1],
                            }}
                        >
                            <CategoryTile category={cat} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
