/**
 * Custom next/image loader — optimizes images at the SOURCE CDN's edge instead
 * of proxying through Next's server optimizer (which timed out / 500'd under the
 * concurrency of an image grid). Runs client-side; returns a transformed URL per
 * requested width so <Image> still produces a responsive srcset.
 *
 *   - Cloudinary  → inject `f_auto,q_auto,c_limit,w_<width>` after /upload/
 *   - Unsplash    → resize via its image API params (w/q/auto/fit)
 *   - Pexels      → resize via its params (w/auto/cs)
 *   - anything else (local assets, unknown hosts) → returned unchanged
 *
 * With a custom loader, Next does NOT use `remotePatterns` for host validation
 * and never hits `/_next/image`, so unconfigured hosts can't crash the page.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const q = quality || 75;

  // Cloudinary — apply edge transforms. Stored URLs are clean (no transforms),
  // so a single replace of the first `/upload/` is safe.
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }

  try {
    const u = new URL(src);

    // Unsplash supports on-the-fly resizing/format via query params.
    if (u.hostname.endsWith("unsplash.com")) {
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", String(q));
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }

    // Pexels supports resizing + compression via query params.
    if (u.hostname.endsWith("pexels.com")) {
      u.searchParams.set("auto", "compress");
      u.searchParams.set("cs", "tinysrgb");
      u.searchParams.set("w", String(width));
      return u.toString();
    }
  } catch {
    // Relative/local path (e.g. /placeholder-product.svg) — fall through.
  }

  return src;
}
