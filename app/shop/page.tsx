import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import { getProducts, getCategories, getSiteSettings } from "@/lib/queries";
import ShopContent from "@/components/modules/ShopContent";
import { getText } from "@/lib/textDefaults";
import { SettingsProvider } from "@/lib/SettingsProvider";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "Buy Meat Online in Lagos — Beef, Chicken, Goat & Offal",
    description:
        "Order chicken, beef, goat, turkey and assorted meat (shaki, ponmo, cow leg) online in Lagos. Fresh, chilled & frozen cuts with same-day delivery to Yaba, Igbobi, Lekki, Victoria Island & mainland Lagos.",
    alternates: { canonical: "/shop" },
    openGraph: {
        title: "Buy Meat Online in Lagos | Zúta Ya",
        description:
            "Order chicken, beef, goat & assorted meat online in Lagos. Same-day delivery to Yaba, Igbobi, Lekki, Victoria Island & mainland.",
        url: "/shop",
        type: "website",
    },
};

export default async function ShopPage() {
    const [products, categories, settings] = await Promise.all([
        getProducts(),
        getCategories(),
        getSiteSettings(),
    ]);

    const ct = settings?.customTexts;

    return (
        <SettingsProvider settings={settings}>
            <Header />
            <main className="min-h-screen bg-base">
                {/* Shop hero */}
                <div data-theme="dark" className="relative overflow-hidden bg-gradient-to-br from-brand-green via-brand-green/90 to-brand-black text-warm-cream">
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(253,246,236,0.5) 0.5px, transparent 0)", backgroundSize: "24px 24px" }} />
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-warm-cream/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
                    <div className="max-w-7xl mx-auto px-6 pt-10 pb-14 relative z-10">
                        <div className="flex items-center gap-2 text-xs text-warm-cream/40 mb-5">
                            <a href="/" className="hover:text-warm-cream/70 transition-colors">Home</a>
                            <span>/</span>
                            <span className="text-warm-cream/70">Shop</span>
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">{getText(ct, "shop.heading")}</h1>
                        <p className="text-warm-cream/50 mt-3 text-sm md:text-base max-w-lg">{getText(ct, "shop.desc")}</p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">
                    {/* SEO intro — keyword context for the product listing */}
                    <p className="text-warm-cream/45 text-sm leading-relaxed max-w-3xl mb-8">
                        Order premium meat online in Lagos and get it delivered to your door the same day.
                        ZúTa Ya stocks fresh, chilled and frozen cuts — beef, chicken, goat, turkey, offal and
                        assorted meat like shaki, ponmo and cow leg — all cold-chain packed and hygienically
                        prepared. Whether it's a weeknight dinner, stocking the freezer, or party meat for an
                        owambe, shop well-trimmed cuts at honest prices, with same-day delivery across Yaba,
                        Igbobi, Lekki, Victoria Island and mainland Lagos.
                    </p>
                    <Suspense>
                        <ShopContent products={products} categories={categories} />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </SettingsProvider>
    );
}
