"use client";

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import Image from "next/image";
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ProductImageGalleryProps {
    images: string[];
    name: string;
}

export default function ProductImageGallery({ images, name }: ProductImageGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const [direction, setDirection] = useState(0);

    const goTo = useCallback((index: number) => {
        setDirection(index > activeIndex ? 1 : -1);
        setActiveIndex(index);
    }, [activeIndex]);

    const prev = useCallback(() => {
        setDirection(-1);
        setActiveIndex(i => (i - 1 + images.length) % images.length);
    }, [images.length]);

    const next = useCallback(() => {
        setDirection(1);
        setActiveIndex(i => (i + 1) % images.length);
    }, [images.length]);

    const handleDragEnd = (_: never, info: PanInfo) => {
        if (info.offset.x < -50) next();
        else if (info.offset.x > 50) prev();
    };

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0 }),
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
        >
            {/* Main Image */}
            <div
                className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-warm-cream/5 group cursor-zoom-in"
                onClick={() => setZoomed(true)}
            >
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={activeIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.4}
                        onDragEnd={handleDragEnd}
                        className="absolute inset-0"
                    >
                        <Image
                            src={images[activeIndex]}
                            alt={`${name} — image ${activeIndex + 1}`}
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-cover"
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Nav arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); prev(); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-[#222]/90 backdrop-blur-sm p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#222] hover:scale-105 cursor-pointer shadow-md"
                        >
                            <ChevronLeft size={16} className="text-warm-cream" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); next(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#222]/90 backdrop-blur-sm p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#222] hover:scale-105 cursor-pointer shadow-md"
                        >
                            <ChevronRight size={16} className="text-warm-cream" />
                        </button>
                    </>
                )}

                {/* Image dots indicator */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                                className={`rounded-full transition-all duration-300 cursor-pointer ${i === activeIndex
                                        ? "w-6 h-1.5 bg-[#222] shadow-sm"
                                        : "w-1.5 h-1.5 bg-[#222]/50 hover:bg-[#222]/70"
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-2.5">
                    {images.map((img, i) => (
                        <button
                            key={img}
                            type="button"
                            onClick={() => goTo(i)}
                            className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${i === activeIndex
                                    ? "ring-2 ring-brand-green ring-offset-2 opacity-100"
                                    : "opacity-40 hover:opacity-70"
                                }`}
                        >
                            <Image src={img} alt={`${name} thumbnail ${i + 1}`} fill sizes="80px" className="object-cover" />
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            <AnimatePresence>
                {zoomed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
                        onClick={() => setZoomed(false)}
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setZoomed(false)}
                            className="absolute top-4 right-4 p-3 rounded-full bg-[#222]/10 hover:bg-[#222]/20 transition-colors cursor-pointer z-10"
                        >
                            <X size={20} className="text-white" />
                        </button>

                        <motion.div
                            initial={{ scale: 0.92 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.92 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="relative w-full max-w-3xl aspect-[3/4]"
                        >
                            <Image
                                src={images[activeIndex]}
                                alt={name}
                                fill
                                sizes="100vw"
                                className="object-contain"
                            />
                        </motion.div>

                        {images.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); prev(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-[#222]/10 backdrop-blur-sm p-3 rounded-full hover:bg-[#222]/25 transition-colors cursor-pointer"
                                >
                                    <ChevronLeft size={22} className="text-white" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); next(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#222]/10 backdrop-blur-sm p-3 rounded-full hover:bg-[#222]/25 transition-colors cursor-pointer"
                                >
                                    <ChevronRight size={22} className="text-white" />
                                </button>
                            </>
                        )}

                        {/* Lightbox dots */}
                        {images.length > 1 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                                {images.map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); goTo(i); }}
                                        className={`rounded-full transition-all duration-300 cursor-pointer ${i === activeIndex
                                                ? "w-6 h-1.5 bg-[#222]"
                                                : "w-1.5 h-1.5 bg-[#222]/40 hover:bg-[#222]/60"
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
