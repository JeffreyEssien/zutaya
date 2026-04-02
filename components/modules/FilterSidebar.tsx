"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Category } from "@/types";
import { ChevronDown } from "lucide-react";

interface FilterSidebarProps {
    categories: Category[];
    selectedCategory: string;
    selectedBrand: string;
    selectedStorageType: string;
    priceRange: [number, number];
    onCategoryChange: (v: string) => void;
    onBrandChange: (v: string) => void;
    onStorageTypeChange: (v: string) => void;
    onPriceChange: (v: [number, number]) => void;
}

export default function FilterSidebar({
    categories,
    selectedCategory,
    selectedBrand,
    selectedStorageType,
    priceRange,
    onCategoryChange,
    onBrandChange,
    onStorageTypeChange,
    onPriceChange,
}: FilterSidebarProps) {
    return (
        <aside className="w-full lg:w-60 shrink-0 space-y-1">
            <CollapsibleSection title="Category" defaultOpen>
                <div className="flex flex-wrap gap-2">
                    <FilterChip label="All" active={selectedCategory === ""} onClick={() => onCategoryChange("")} />
                    {categories.map((c) => (
                        <FilterChip key={c.id} label={c.name} active={selectedCategory === c.slug} onClick={() => onCategoryChange(c.slug)} />
                    ))}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Price" defaultOpen>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: "All Prices", value: [0, Infinity] as [number, number] },
                        { label: "Under ₦50,000", value: [0, 50000] as [number, number] },
                        { label: "₦50k – ₦100k", value: [50000, 100000] as [number, number] },
                        { label: "Over ₦100k", value: [100000, Infinity] as [number, number] },
                    ].map((p) => (
                        <FilterChip
                            key={p.label}
                            label={p.label}
                            active={priceRange[0] === p.value[0] && priceRange[1] === p.value[1]}
                            onClick={() => onPriceChange(p.value)}
                        />
                    ))}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Cut Type" defaultOpen={false}>
                <div className="flex flex-wrap gap-2">
                    <FilterChip label="All Cuts" active={selectedBrand === ""} onClick={() => onBrandChange("")} />
                    {["Whole", "Fillet", "Diced", "Mince", "Steak"].map((cut) => (
                        <FilterChip key={cut} label={cut} active={selectedBrand === cut} onClick={() => onBrandChange(cut)} />
                    ))}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Storage Type" defaultOpen={false}>
                <div className="flex flex-wrap gap-2">
                    <FilterChip label="All" active={selectedStorageType === ""} onClick={() => onStorageTypeChange("")} />
                    {["fresh", "chilled", "frozen"].map((type) => (
                        <FilterChip key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} active={selectedStorageType === type} onClick={() => onStorageTypeChange(type)} />
                    ))}
                </div>
            </CollapsibleSection>
        </aside>
    );
}

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-brand-lilac/10 py-4">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-1 cursor-pointer group"
            >
                <h3 className="text-xs font-semibold text-brand-dark/60 uppercase tracking-[0.15em] group-hover:text-brand-dark transition-colors">
                    {title}
                </h3>
                <ChevronDown
                    size={14}
                    className={`text-brand-dark/30 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 pb-1">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3.5 py-1.5 text-xs rounded-full transition-all duration-300 cursor-pointer ${active
                ? "bg-brand-purple text-white font-medium shadow-sm shadow-brand-purple/20"
                : "bg-neutral-50 text-brand-dark/55 hover:bg-neutral-100 hover:text-brand-dark border border-transparent hover:border-brand-lilac/20"
                }`}
        >
            {label}
        </button>
    );
}
