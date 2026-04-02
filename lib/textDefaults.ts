/** All editable text keys grouped by section, with defaults.
 *  Components read via `getText(settings, key)`.
 *  Admin settings form renders these grouped for editing.
 */

export interface TextGroup {
    label: string;
    keys: { key: string; label: string; default: string; multiline?: boolean }[];
}

export const TEXT_GROUPS: TextGroup[] = [
    {
        label: "Homepage Hero",
        keys: [
            { key: "hero.eyebrow", label: "Eyebrow Badge", default: "PREMIUM MEAT DELIVERY · LAGOS" },
            { key: "hero.heading", label: "Heading", default: "Premium Meat. Delivered Fresh." },
            { key: "hero.subheading", label: "Subheading", default: "Fresh, chilled, and frozen cuts sourced from trusted suppliers — cold-chain packed and delivered to your door in Lagos.", multiline: true },
            { key: "hero.cta", label: "Primary CTA", default: "Shop Now" },
            { key: "hero.cta2", label: "Secondary CTA", default: "Build Your Box" },
        ],
    },
    {
        label: "Promise Bar",
        keys: [
            { key: "promise.1.title", label: "Promise 1 Title", default: "Quality Guaranteed" },
            { key: "promise.1.desc", label: "Promise 1 Description", default: "Every cut inspected and certified" },
            { key: "promise.2.title", label: "Promise 2 Title", default: "Cold-Chain Packed" },
            { key: "promise.2.desc", label: "Promise 2 Description", default: "Sealed cold from source to door" },
            { key: "promise.3.title", label: "Promise 3 Title", default: "Same-Day Delivery" },
            { key: "promise.3.desc", label: "Promise 3 Description", default: "Order by 12pm, get it today" },
            { key: "promise.4.title", label: "Promise 4 Title", default: "Fresh Daily" },
            { key: "promise.4.desc", label: "Promise 4 Description", default: "Sourced fresh every morning" },
        ],
    },
    {
        label: "New Arrivals Section",
        keys: [
            { key: "arrivals.eyebrow", label: "Eyebrow", default: "Just Arrived" },
            { key: "arrivals.heading", label: "Heading", default: "New Arrivals" },
            { key: "arrivals.link", label: "Link Text", default: "View All" },
        ],
    },
    {
        label: "Shop by Category Section",
        keys: [
            { key: "categories.eyebrow", label: "Eyebrow", default: "Browse" },
            { key: "categories.heading", label: "Heading", default: "Shop by Category" },
            { key: "categories.link", label: "Link Text", default: "All Categories" },
        ],
    },
    {
        label: "Bundle CTA Section",
        keys: [
            { key: "cta.eyebrow", label: "Eyebrow", default: "Save More" },
            { key: "cta.heading", label: "Heading", default: "Build Your Own Box & Save Up to 20%" },
            { key: "cta.desc", label: "Description", default: "Mix and match your favourite premium cuts into a custom bundle. The more you add, the more you save.", multiline: true },
            { key: "cta.button1", label: "Primary Button", default: "Build Your Box" },
            { key: "cta.button2", label: "Secondary Button", default: "Browse All Cuts" },
        ],
    },
    {
        label: "About Section",
        keys: [
            { key: "about.eyebrow", label: "Eyebrow", default: "Our Story" },
            { key: "about.heading", label: "Heading", default: "From the Market to Your Kitchen" },
            { key: "about.paragraph1", label: "Paragraph 1", default: "Zúta Ya was born from a simple belief: every home in Lagos deserves access to premium, fresh meat — delivered with care and cold-chain integrity.", multiline: true },
            { key: "about.paragraph2", label: "Paragraph 2", default: "We source the finest cuts directly from trusted suppliers. Every piece is inspected, properly stored, and delivered cold-chain packed to your door. From whole chickens to premium steaks, we bring the butcher shop experience to your kitchen.", multiline: true },
            { key: "about.features.eyebrow", label: "Features Eyebrow", default: "Why Choose Us" },
            { key: "about.features.heading", label: "Features Heading", default: "Built on Trust, Delivered with Care" },
            { key: "about.promise", label: "Promise Card Text", default: "Every order is packed with care, kept cold, and delivered fresh. If it doesn't meet your standards, we'll make it right — no questions asked.", multiline: true },
            { key: "about.quote", label: "Signature Quote", default: "More than meat delivery. It's freshness. It's trust. It's Zúta Ya." },
        ],
    },
    {
        label: "Shop Page",
        keys: [
            { key: "shop.heading", label: "Heading", default: "Shop All Cuts" },
            { key: "shop.desc", label: "Description", default: "Premium meat sourced fresh, cold-chain packed and delivered to your door." },
        ],
    },
    {
        label: "Bundles Page",
        keys: [
            { key: "bundles.heading", label: "Heading", default: "Build Your Box" },
            { key: "bundles.desc", label: "Description", default: "Pick a bundle, choose your cuts, and save big. Mix and match your favourite premium meats." },
        ],
    },
    {
        label: "Footer",
        keys: [
            { key: "footer.tagline", label: "Tagline", default: "Premium meat delivery across Lagos and Nigeria." },
            { key: "footer.copyright", label: "Copyright Text", default: "© {year} Zúta Ya. All rights reserved." },
        ],
    },
];

/** Build a flat key→default lookup */
const defaults: Record<string, string> = {};
for (const group of TEXT_GROUPS) {
    for (const k of group.keys) {
        defaults[k.key] = k.default;
    }
}

/** Get editable text with fallback to default */
export function getText(customTexts: Record<string, string> | undefined, key: string): string {
    return customTexts?.[key] || defaults[key] || "";
}
