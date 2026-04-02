"use client";

import { motion } from "framer-motion";
import { Snowflake, Truck, ShieldCheck, Clock } from "lucide-react";

const promises = [
    {
        icon: ShieldCheck,
        title: "Quality Guaranteed",
        desc: "Every cut inspected and certified",
    },
    {
        icon: Snowflake,
        title: "Cold-Chain Packed",
        desc: "Sealed cold from source to door",
    },
    {
        icon: Truck,
        title: "Same-Day Delivery",
        desc: "Order by 12pm, get it today",
    },
    {
        icon: Clock,
        title: "Fresh Daily",
        desc: "Sourced fresh every morning",
    },
];

export default function PromiseBar() {
    return (
        <section className="py-12 md:py-16 px-6 border-b border-warm-tan/10">
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
                            <div className="w-12 h-12 rounded-full bg-brand-red/[0.07] flex items-center justify-center mb-3 group-hover:bg-brand-red/[0.12] transition-colors duration-300">
                                <p.icon size={20} strokeWidth={1.5} className="text-brand-red" />
                            </div>
                            <h3 className="text-sm font-semibold text-brand-dark tracking-wide mb-1">{p.title}</h3>
                            <p className="text-xs text-brand-dark/40 font-light">{p.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
