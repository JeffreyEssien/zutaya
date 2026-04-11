"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { getText } from "@/lib/textDefaults";

export default function HomeCta({ customTexts }: { customTexts?: Record<string, string> }) {
    return (
        <section className="py-20 md:py-28 px-6">
            <div className="max-w-[1400px] mx-auto">
                <div className="relative bg-deep-espresso rounded-3xl overflow-hidden px-8 md:px-16 py-16 md:py-20">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-brand-red/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-warm-tan/8 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                        <div className="flex-1 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                <p className="text-[11px] uppercase tracking-[0.3em] text-brand-red mb-4 font-medium">{getText(customTexts, "cta.eyebrow")}</p>
                                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-warm-cream leading-tight mb-4">
                                    {getText(customTexts, "cta.heading")}
                                </h2>
                                <p className="text-warm-cream/50 text-base md:text-lg max-w-lg mx-auto lg:mx-0 font-light leading-relaxed">
                                    {getText(customTexts, "cta.desc")}
                                </p>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <Link
                                href="/bundles"
                                className="inline-flex items-center justify-center gap-3 bg-brand-red text-white px-8 py-4 rounded-xl font-semibold hover:bg-brand-red/90 transition-all shadow-lg shadow-brand-red/20 hover:shadow-brand-red/30 group"
                            >
                                <Package size={18} />
                                {getText(customTexts, "cta.button1")}
                                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link
                                href="/shop"
                                className="inline-flex items-center justify-center gap-2 border border-warm-cream/20 text-warm-cream px-8 py-4 rounded-xl font-semibold hover:bg-warm-cream/10 transition-all"
                            >
                                {getText(customTexts, "cta.button2")}
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
