import { Suspense } from "react";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import { getProducts, getCategories, getSiteSettings } from "@/lib/queries";
import ShopContent from "@/components/modules/ShopContent";
import { getText } from "@/lib/textDefaults";
import { SettingsProvider } from "@/lib/SettingsProvider";

export const revalidate = 60;

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
            <main className="min-h-screen bg-brand-black">
                {/* Shop hero */}
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-green via-brand-green/90 to-brand-black text-warm-cream">
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
                    <Suspense>
                        <ShopContent products={products} categories={categories} />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </SettingsProvider>
    );
}
