"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useEffect, useState, useRef } from "react";
import { getSiteSettings } from "@/lib/queries";
import type { SiteSettings } from "@/types";
import Image from "next/image";
import { ArrowDown } from "lucide-react";

const textReveal = {
    hidden: { y: "100%", opacity: 0 },
    visible: (i: number) => ({
        y: "0%",
        opacity: 1,
        transition: {
            delay: 0.3 + i * 0.08,
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
    }),
};

export default function Hero() {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const sectionRef = useRef<HTMLElement>(null);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });

    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

    useEffect(() => {
        getSiteSettings().then(setSettings).catch(() => { });
    }, []);

    const headingText = settings?.heroHeading || "Premium Meat. Delivered Fresh.";
    const headingWords = typeof headingText === "string" ? headingText.split(" ") : [];
    const subheading = settings?.heroSubheading || "Fresh, chilled, and frozen cuts sourced from trusted suppliers — cold-chain packed and delivered to your door in Lagos.";
    const ctaText = settings?.heroCtaText || "Shop Now";
    const ctaLink = settings?.heroCtaLink || "/shop";

    return (
        <section ref={sectionRef} className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-warm-cream grain-overlay">
            {/* Parallax background */}
            <motion.div style={{ y: backgroundY }} className="absolute inset-0 -top-20 -bottom-20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-warm-tan/12 via-warm-cream to-warm-cream" />

                {settings?.heroImage && (
                    <div className="absolute inset-0 z-0 animate-fade-in">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/70 to-white/95 z-10" />
                        <Image
                            src={settings.heroImage}
                            alt="Hero Background"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}
            </motion.div>

            {/* Dot pattern */}
            <div
                className="absolute inset-0 opacity-[0.025] z-0"
                style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, #7A5C3A 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Floating orbs */}
            <motion.div
                animate={{ y: [-30, 30, -30], x: [-15, 15, -15], scale: [1, 1.1, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-[8%] w-80 h-80 bg-brand-red/[0.04] rounded-full blur-[120px] z-0"
            />
            <motion.div
                animate={{ y: [20, -40, 20], x: [10, -20, 10], scale: [1, 1.15, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/4 right-[5%] w-96 h-96 bg-warm-tan/[0.06] rounded-full blur-[140px] z-0"
            />

            {/* Content */}
            <motion.div
                style={{ opacity: contentOpacity, y: contentY }}
                className="relative z-10 text-center px-6 max-w-3xl mx-auto"
            >
                {/* Eyebrow */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.6 }}
                    className="mb-8"
                >
                    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-brand-red font-medium px-4 py-2 rounded-full border border-brand-red/15 bg-brand-red/[0.04]">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                        PREMIUM MEAT DELIVERY · LAGOS
                    </span>
                </motion.div>

                {/* Headline with word-by-word reveal */}
                <div className="overflow-hidden mb-8">
                    <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-brand-dark leading-[1.05] tracking-tight">
                        {headingWords.length > 0 ? (
                            headingWords.map((word, i) => (
                                <span key={i} className="inline-block overflow-hidden mr-[0.25em] last:mr-0">
                                    <motion.span
                                        custom={i}
                                        variants={textReveal}
                                        initial="hidden"
                                        animate="visible"
                                        className={`inline-block ${i === headingWords.length - 1 ? "text-gradient-luxury font-bold italic" : ""}`}
                                    >
                                        {word}
                                    </motion.span>
                                </span>
                            ))
                        ) : (
                            <>
                                Smart. Comfortable.
                                <br />
                                <span className="text-gradient-luxury font-bold">Intentional.</span>
                            </>
                        )}
                    </h1>
                </div>

                {/* Subheading */}
                <motion.p
                    initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                    className="text-base md:text-lg text-brand-dark/55 mb-12 max-w-xl mx-auto leading-relaxed font-light"
                >
                    {subheading}
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                >
                    <Link href={ctaLink}>
                        <Button size="lg" className="luxury-button px-10 tracking-wider shadow-lg shadow-brand-dark/10 hover:shadow-brand-red/20">
                            {ctaText}
                        </Button>
                    </Link>
                    <Link href="/bundles" className="group flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-brand-dark/60 hover:text-brand-red transition-colors duration-300">
                        <span className="relative">
                            Build Your Box
                            <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-brand-red origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
                        </span>
                    </Link>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 0.6 }}
                    className="absolute bottom-20 md:bottom-8 left-1/2 -translate-x-1/2"
                >
                    <motion.button
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        onClick={() => {
                            const next = sectionRef.current?.nextElementSibling;
                            next?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="mx-auto flex flex-col items-center gap-2 text-brand-dark/25 hover:text-brand-purple/50 transition-colors cursor-pointer"
                    >
                        <span className="text-[9px] uppercase tracking-[0.3em]">Scroll</span>
                        <ArrowDown size={14} strokeWidth={1.5} />
                    </motion.button>
                </motion.div>
            </motion.div>

        </section>
    );
}
