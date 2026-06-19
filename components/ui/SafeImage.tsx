"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK = "/placeholder-product.svg";

/**
 * Drop-in replacement for next/image that handles:
 *   - empty / undefined src
 *   - failed-to-load remote URLs (e.g. dead Unsplash links in seed data)
 *
 * Always renders a placeholder instead of a broken image.
 */
export default function SafeImage({
    src,
    alt,
    ...rest
}: Omit<ImageProps, "src"> & { src?: string | null }) {
    const initial = src && src.trim().length > 0 ? src : FALLBACK;
    const [current, setCurrent] = useState<string>(initial);

    return (
        <Image
            {...rest}
            src={current}
            alt={alt || "Product image"}
            onError={() => {
                if (current !== FALLBACK) setCurrent(FALLBACK);
            }}
            unoptimized={current === FALLBACK}
        />
    );
}

export function safeImageUrl(url?: string | null): string {
    return url && url.trim().length > 0 ? url : FALLBACK;
}
