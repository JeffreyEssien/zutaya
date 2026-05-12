"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProductImageGallery from "@/components/modules/ProductImageGallery";
import ProductDetails from "@/components/modules/ProductDetails";
import type { Product, Marinade, ProcessingOption, CompletionMode } from "@/types";

interface Props {
    product: Product;
    marinades: Marinade[];
    processingOptions: ProcessingOption[];
    eventsEnabled: boolean;
}

export default function ProductPageShell({ product, marinades, processingOptions, eventsEnabled }: Props) {
    const [mode, setMode] = useState<CompletionMode>("cook_myself");

    const images = useMemo(() => {
        if (mode === "event" && product.imageEvent) return [product.imageEvent, ...(product.images || []).slice(0, 3)];
        return product.images && product.images.length > 0 ? product.images : ["/placeholder.png"];
    }, [mode, product.images, product.imageEvent]);

    const tone =
        mode === "event"
            ? "from-emerald-500/15 via-transparent to-transparent"
            : "from-warm-cream/0 via-transparent to-transparent";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 relative">
            <AnimatePresence>
                <motion.div
                    key={`tone-${mode}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b ${tone}`}
                />
            </AnimatePresence>

            <motion.div
                key={`gallery-${mode}-${images[0]}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <ProductImageGallery images={images} name={product.name} />
            </motion.div>

            <ProductDetails
                product={product}
                marinades={marinades}
                processingOptions={processingOptions}
                eventsEnabled={eventsEnabled}
                mode={mode}
                onModeChange={setMode}
            />
        </div>
    );
}
