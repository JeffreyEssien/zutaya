"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChefHat, Calendar, ArrowRight } from "lucide-react";

interface Props {
    eventsEnabled?: boolean;
    headline?: string;
    subhead?: string;
}

export default function ServicesPillar({ eventsEnabled = true, headline = "Two ways to eat with us", subhead = "Pick your moment, we handle the meat." }: Props) {
    const cards = [
        { key: "shop", title: "Cook it yourself", sub: "Premium cuts, processed your way", icon: ChefHat, href: "/shop", show: true },
        { key: "events", title: "At your event", sub: "On-site butchery & chef service", icon: Calendar, href: "/events", show: eventsEnabled },
    ].filter((c) => c.show);

    if (cards.length <= 1) return null;

    return (
        <section className="py-16 md:py-24 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="font-serif text-3xl md:text-4xl text-warm-cream">{headline}</h2>
                    <p className="text-warm-cream/55 mt-2 text-sm md:text-base">{subhead}</p>
                </div>
                <div className={`grid gap-5 ${cards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                    {cards.map((c) => {
                        const Icon = c.icon;
                        return (
                            <Link key={c.key} href={c.href}>
                                <motion.div whileHover={{ y: -6 }} className="group h-full bg-white/[0.03] rounded-2xl border border-warm-cream/8 hover:border-brand-green/40 p-7 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-brand-green/15 text-brand-green flex items-center justify-center mb-4 group-hover:bg-brand-green group-hover:text-white transition-colors">
                                        <Icon size={22} />
                                    </div>
                                    <h3 className="font-serif text-2xl text-warm-cream mb-2">{c.title}</h3>
                                    <p className="text-warm-cream/55 text-sm">{c.sub}</p>
                                    <p className="mt-5 text-xs text-brand-green flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                                        Explore <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </p>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
