"use client";

import { motion } from "framer-motion";
import { Snowflake, Truck, ShieldCheck, Clock } from "lucide-react";
import { getText } from "@/lib/textDefaults";

const promiseIcons = [ShieldCheck, Snowflake, Truck, Clock];
const promiseKeys = ["promise.1", "promise.2", "promise.3", "promise.4"];

export default function PromiseBar({ customTexts }: { customTexts?: Record<string, string> }) {
    const promises = promiseKeys.map((key, i) => ({
        icon: promiseIcons[i],
        title: getText(customTexts, `${key}.title`),
        desc: getText(customTexts, `${key}.desc`),
    }));
    return (
        <section className="py-12 md:py-16 px-6 border-b border-warm-cream/5">
            <div className="max-w-[1400px] mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
                    {promises.map((p, i) => (
                        <motion.div
                            key={p.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="flex flex-col items-center text-center group"
                        >
                            <div className="w-12 h-12 rounded-full bg-brand-green/[0.08] flex items-center justify-center mb-3 group-hover:bg-brand-green/[0.14] transition-colors duration-300">
                                <p.icon size={20} strokeWidth={1.5} className="text-brand-green" />
                            </div>
                            <h3 className="text-sm font-semibold text-warm-cream tracking-wide mb-1">{p.title}</h3>
                            <p className="text-xs text-warm-cream/40 font-light">{p.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
