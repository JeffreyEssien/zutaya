import {
  SITE_NAME,
  SITE_EMAIL,
  WHATSAPP_NUMBER,
  BUSINESS_HOURS,
  BUSINESS_ADDRESS,
  INSTAGRAM_HANDLE,
} from "@/lib/constants";
import type { Product, ZutayaPackage } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

/** Canonical site origin (no trailing slash). Set NEXT_PUBLIC_SITE_URL in prod. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://zutaya.vercel.app").replace(
  /\/+$/,
  "",
);

/** Build an absolute URL from a path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Strip HTML tags and collapse whitespace — for meta descriptions / schema. */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clamp a string to a max length on a word boundary (for meta descriptions). */
export function truncate(text: string, max = 160): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/**
 * Transactional meta description for a product (PDP) — per the SEO playbook:
 * leads with price, includes a delivery incentive and a clear CTA, ~110–160 chars.
 */
export function productMetaDescription(product: Product): string {
  const unit =
    product.priceUnit === "per_kg"
      ? "/kg"
      : product.priceUnit === "per_pack"
        ? "/pack"
        : product.priceUnit === "per_piece"
          ? " each"
          : "";
  const price = `${formatCurrency(product.price)}${unit}`;
  const cut = product.cutType ? `${product.cutType} ` : "";
  return truncate(
    `${product.name} — ${price}. Premium ${cut}${product.category}, cold-chain packed with same-day delivery across Lagos. Order online now.`,
    160,
  );
}

const phoneIntl = `+${WHATSAPP_NUMBER}`;
const sameAs = [
  `https://instagram.com/${INSTAGRAM_HANDLE.replace(/^@/, "")}`,
  `https://wa.me/${WHATSAPP_NUMBER}`,
];

/** Organization schema — site-wide identity for Google Knowledge Graph. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/zutayalogo.jpg"),
    email: SITE_EMAIL,
    telephone: phoneIntl,
    sameAs,
  };
}

/** WebSite schema with a Sitelinks search box pointing at /shop. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * LocalBusiness schema — the Lagos map-pack signal.
 * TODO: add geo (lat/lng) for full local rich results; Google will otherwise
 * geocode the postal address below.
 */
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "@id": `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    image: absoluteUrl("/og-image.jpg"),
    url: SITE_URL,
    telephone: phoneIntl,
    email: SITE_EMAIL,
    priceRange: "₦₦",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_ADDRESS.street,
      addressLocality: BUSINESS_ADDRESS.locality,
      addressRegion: BUSINESS_ADDRESS.region,
      addressCountry: BUSINESS_ADDRESS.country,
    },
    areaServed: ["Lagos", "Yaba", "Igbobi", "Lekki", "Victoria Island", "Lagos Mainland"].map(
      (name) => ({ "@type": "City", name }),
    ),
    openingHours: "Mo-Sa 08:00-18:00", // mirrors BUSINESS_HOURS: 8am–6pm Mon–Sat
    description: `${SITE_NAME} — ${BUSINESS_HOURS}. Premium fresh, chilled & frozen meat delivered across Lagos.`,
    sameAs,
  };
}

/** Product + Offer schema — unlocks price/availability rich snippets.
 * Pass `rating` (from approved reviews only) to emit aggregateRating stars. */
export function productSchema(product: Product, rating?: { average: number; count: number }) {
  const url = absoluteUrl(`/product/${product.slug}`);
  const images = (product.images || []).filter(Boolean);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: productMetaDescription(product),
    image: images.length ? images : [absoluteUrl("/og-image.jpg")],
    sku: product.id,
    category: product.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NGN",
      price: product.price,
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
  // Only emit aggregateRating with real, approved reviews (faking = Google penalty).
  if (rating && rating.count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.average,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return schema;
}

/** Transactional meta description for a Zútaya Package (curated box). */
export function packageMetaDescription(pkg: ZutayaPackage): string {
  const contents = pkg.items
    .map((i) => i.label || i.productName)
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");
  return truncate(
    `${pkg.name} — ${formatCurrency(pkg.price)}. Curated meat box${contents ? `: ${contents}` : ""}. Cold-chain packed, delivered fresh across Lagos. Order online now.`,
    160,
  );
}

/**
 * Product + Offer schema for a Zútaya Package — unlocks price/availability
 * rich snippets. Availability mirrors the live stock of the linked products.
 */
export function packageSchema(pkg: ZutayaPackage) {
  const url = absoluteUrl(`/bundles#${pkg.slug}`);
  const images = [pkg.imageUrl].filter(Boolean) as string[];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.name,
    description: packageMetaDescription(pkg),
    image: images.length ? images : [absoluteUrl("/og-image.jpg")],
    sku: pkg.id,
    category: "Meat Package",
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NGN",
      price: pkg.price,
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      availability:
        pkg.available === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

/** BreadcrumbList schema. Pass ordered { name, path } crumbs. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
