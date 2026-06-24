"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK = "/placeholder-product.svg";

/**
 * Hosts we run through Next's image optimizer. Everything else (arbitrary
 * pasted links, legacy Unsplash/Pexels seed URLs) renders `unoptimized` so it
 * bypasses the remotePatterns allowlist — otherwise next/image THROWS at render
 * for an unconfigured host and crashes the whole page (onError can't catch it).
 * New uploads route through Cloudinary, so they hit the optimized path.
 */
function isOptimizableHost(src: string): boolean {
    if (src.startsWith("/")) return true; // local asset
    try {
        const host = new URL(src).hostname;
        return host.endsWith("res.cloudinary.com") || host.endsWith(".supabase.co");
    } catch {
        return false;
    }
}

/**
 * Drop-in replacement for next/image that handles:
 *   - empty / undefined src
 *   - failed-to-load remote URLs (e.g. dead Unsplash links in seed data)
 *   - URLs from hosts not configured in next.config (renders them unoptimized
 *     instead of throwing)
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
            unoptimized={current === FALLBACK || !isOptimizableHost(current)}
        />
    );
}

export function safeImageUrl(url?: string | null): string {
    return url && url.trim().length > 0 ? url : FALLBACK;
}
