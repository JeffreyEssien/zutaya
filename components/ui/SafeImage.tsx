"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK = "/placeholder-product.svg";

/**
 * Drop-in replacement for next/image that handles:
 *   - empty / undefined src
 *   - failed-to-load remote URLs (e.g. dead Unsplash links in seed data)
 *
 * Optimization is handled by the custom loader in `lib/imageLoader.ts` (Cloudinary
 * edge transforms / Unsplash/Pexels params), so any host is safe — no optimizer,
 * no remotePatterns crashes. The local SVG fallback is rendered `unoptimized`.
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
