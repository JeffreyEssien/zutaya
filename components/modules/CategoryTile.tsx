"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Category } from "@/types";
import { ArrowUpRight } from "lucide-react";

interface CategoryTileProps {
    category: Category;
}

export default function CategoryTile({ category }: CategoryTileProps) {
    return (
        <Link href={`/shop?category=${category.slug}`} className="group block">
            <motion.div
                whileHover="hover"
                initial="initial"
                className="relative aspect-[3/4] sm:aspect-square overflow-hidden rounded-2xl transition-shadow duration-500 hover:shadow-2xl hover:shadow-brand-green/10"
            >
                {/* Parallax image */}
                <motion.div
                    variants={{
                        initial: { scale: 1 },
                        hover: { scale: 1.08 },
                    }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 w-full h-full"
                >
                    <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                    />
                </motion.div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5 group-hover:from-black/80 transition-all duration-500" />

                {/* Content */}
                <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end">
                    <motion.div
                        variants={{
                            initial: { y: 8 },
                            hover: { y: 0 },
                        }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-end justify-between"
                    >
                        <div>
                            <h3 className="font-serif text-lg sm:text-xl text-white mb-1 tracking-wide">
                                {category.name}
                            </h3>
                            <p className="text-xs text-white/60 font-light line-clamp-2 leading-relaxed max-w-[85%]">
                                {category.description}
                            </p>
                        </div>
                        <motion.div
                            variants={{
                                initial: { opacity: 0, scale: 0.8 },
                                hover: { opacity: 1, scale: 1 },
                            }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0"
                        >
                            <ArrowUpRight size={15} className="text-white group-hover:rotate-12 transition-transform duration-300" />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Top edge border glow on hover */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
        </Link>
    );
}
