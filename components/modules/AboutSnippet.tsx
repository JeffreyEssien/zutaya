"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { getSiteSettings } from "@/lib/queries";
import type { SiteSettings } from "@/types";
import { useSettings } from "@/lib/SettingsProvider";
import { BUSINESS_PHONE, BUSINESS_HOURS, INSTAGRAM_HANDLE, WHATSAPP_NUMBER } from "@/lib/constants";
import Link from "next/link";
import {
    Beef,
    Thermometer,
    Truck,
    Award,
    ShieldCheck,
    Clock,
    Phone,
    Instagram,
    ArrowRight,
    MapPin,
    MessageCircle,
} from "lucide-react";
import { getText } from "@/lib/textDefaults";

const features = [
    {
        icon: Beef,
        title: "Premium Sourcing",
        desc: "Direct from trusted farms and certified suppliers across Nigeria.",
        accent: "bg-red-50 text-red-600",
    },
    {
        icon: Thermometer,
        title: "Cold-Chain Integrity",
        desc: "Temperature-controlled packaging from warehouse to your door.",
        accent: "bg-blue-50 text-blue-600",
    },
    {
        icon: Truck,
        title: "Swift Delivery",
        desc: "Same-day and next-day delivery across all Lagos zones.",
        accent: "bg-green-50 text-green-600",
    },
    {
        icon: ShieldCheck,
        title: "Quality Guaranteed",
        desc: "Every cut inspected. Not satisfied? We make it right.",
        accent: "bg-purple-50 text-purple-600",
    },
];

const defaultStats = [
    { value: "500+", label: "Happy Customers" },
    { value: "24hrs", label: "Max Delivery Time" },
    { value: "100%", label: "Cold-Chain Packed" },
    { value: "6", label: "Days a Week" },
];

export default function AboutSnippet({ customTexts }: { customTexts?: Record<string, string> }) {
    const ctxSettings = useSettings();
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const sectionRef = useRef<HTMLElement>(null);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });
    const parallaxY = useTransform(scrollYProgress, [0, 1], [40, -40]);

    useEffect(() => {
        if (ctxSettings) {
            setSettings(ctxSettings);
        } else {
            getSiteSettings().then(setSettings).catch(() => {});
        }
    }, [ctxSettings]);

    const stats: { value: string; label: string }[] = (() => {
        if (settings?.aboutStats) {
            try { return JSON.parse(settings.aboutStats); } catch { /* ignore */ }
        }
        return defaultStats;
    })();

    const promiseText = settings?.aboutPromiseText || "Every order is packed with care, kept cold, and delivered fresh. If it doesn\u2019t meet your standards, we\u2019ll make it right \u2014 no questions asked.";
    const signatureQuote = settings?.aboutQuote || "More than meat delivery. It\u2019s freshness. It\u2019s trust. It\u2019s Z\u00fata Ya.";

    return (
        <section id="about" ref={sectionRef} className="relative overflow-hidden">
            {/* ── Story Section ── */}
            <div className="py-24 md:py-32 px-6 bg-warm-cream relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warm-tan/20 to-transparent" />

                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                        {/* Left — text */}
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-80px" }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <p className="text-[11px] uppercase tracking-[0.3em] text-brand-red mb-4 font-medium">{getText(customTexts, "about.eyebrow")}</p>
                                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-brand-dark tracking-tight leading-[1.1] mb-8">
                                    {settings?.ourStoryHeading || getText(customTexts, "about.heading") || (
                                        <>From the Market to <span className="text-gradient-luxury italic">Your Kitchen</span></>
                                    )}
                                </h2>
                            </motion.div>

                            <div className="space-y-5 mb-10">
                                {(settings?.ourStoryText ? settings.ourStoryText.split("\n\n") : [
                                    "Zúta Ya was born from a simple belief: every home in Lagos deserves access to premium, fresh meat — delivered with care and cold-chain integrity.",
                                    "We source the finest cuts directly from trusted suppliers. Every piece is inspected, properly stored, and delivered cold-chain packed to your door. From whole chickens to premium steaks, we bring the butcher shop experience to your kitchen.",
                                ]).map((paragraph, idx) => (
                                    <motion.p
                                        key={idx}
                                        initial={{ opacity: 0, y: 15 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.1 * (idx + 1), duration: 0.6 }}
                                        className="text-base md:text-lg text-brand-dark/50 leading-relaxed font-light"
                                    >
                                        {paragraph}
                                    </motion.p>
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <Link
                                    href="/shop"
                                    className="inline-flex items-center gap-2 text-brand-red font-semibold text-sm hover:gap-3 transition-all group"
                                >
                                    Explore our products <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </motion.div>
                        </div>

                        {/* Right — stats + promise card */}
                        <motion.div
                            style={{ y: parallaxY }}
                            className="space-y-6"
                        >
                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {stats.map((stat, idx) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.08, duration: 0.5 }}
                                        className="bg-white rounded-2xl p-6 border border-warm-tan/10 text-center hover:shadow-md hover:border-brand-red/10 transition-all duration-300"
                                    >
                                        <p className="font-serif text-3xl md:text-4xl font-bold text-brand-dark mb-1">{stat.value}</p>
                                        <p className="text-xs uppercase tracking-widest text-muted-brown">{stat.label}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Promise card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                                className="bg-deep-espresso rounded-2xl p-8 text-warm-cream relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-red/10 rounded-full blur-[80px] pointer-events-none" />
                                <Award size={28} strokeWidth={1.5} className="text-brand-red mb-4" />
                                <h3 className="font-serif text-xl font-bold mb-2">Our Promise</h3>
                                <p className="text-warm-cream/60 text-sm leading-relaxed">
                                    {promiseText}
                                </p>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ── Features Strip ── */}
            <div className="bg-white py-20 md:py-24 px-6 border-t border-warm-tan/10">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-14"
                    >
                        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-red mb-3 font-medium">{getText(customTexts, "about.features.eyebrow")}</p>
                        <h2 className="font-serif text-2xl md:text-3xl text-brand-dark">{settings?.whyZutaYaHeading || getText(customTexts, "about.features.heading")}</h2>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 25 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1, duration: 0.5 }}
                                className="group relative rounded-2xl p-6 border border-warm-tan/10 hover:border-brand-red/15 hover:shadow-lg hover:shadow-brand-red/[0.04] transition-all duration-500"
                            >
                                <div className={`w-12 h-12 rounded-xl ${feature.accent.split(" ")[0]} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon size={22} strokeWidth={1.5} className={feature.accent.split(" ")[1]} />
                                </div>
                                <h3 className="font-serif text-lg text-brand-dark mb-2">{feature.title}</h3>
                                <p className="text-sm text-brand-dark/45 leading-relaxed font-light">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Contact / CTA Strip ── */}
            <div className="bg-warm-cream py-16 md:py-20 px-6 border-t border-warm-tan/10">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Contact info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-4"
                        >
                            <h3 className="font-serif text-xl text-brand-dark font-bold">Get in Touch</h3>
                            <div className="space-y-3">
                                <a href={`tel:${BUSINESS_PHONE}`} className="flex items-center gap-3 text-sm text-brand-dark/60 hover:text-brand-red transition-colors">
                                    <Phone size={16} /> {BUSINESS_PHONE}
                                </a>
                                <a
                                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-brand-dark/60 hover:text-green-600 transition-colors"
                                >
                                    <MessageCircle size={16} /> Chat on WhatsApp
                                </a>
                                <a
                                    href={`https://instagram.com/${INSTAGRAM_HANDLE.replace("@", "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-brand-dark/60 hover:text-pink-600 transition-colors"
                                >
                                    <Instagram size={16} /> {INSTAGRAM_HANDLE}
                                </a>
                            </div>
                        </motion.div>

                        {/* Hours */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4"
                        >
                            <h3 className="font-serif text-xl text-brand-dark font-bold">Business Hours</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-brand-dark/60">
                                    <Clock size={16} /> {BUSINESS_HOURS}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-brand-dark/60">
                                    <MapPin size={16} /> Lagos, Nigeria
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col justify-center"
                        >
                            <p className="font-serif text-xl md:text-2xl text-brand-dark/70 italic leading-relaxed mb-6">
                                &ldquo;{signatureQuote}&rdquo;
                            </p>
                            <Link
                                href="/shop"
                                className="inline-flex items-center justify-center gap-2 bg-brand-red text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-red/90 transition-colors w-fit shadow-sm"
                            >
                                Start Shopping <ArrowRight size={16} />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
