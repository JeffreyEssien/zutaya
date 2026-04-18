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
            <main className="min-h-screen bg-warm-cream">
                {/* Shop hero */}
                <div className="bg-deep-espresso text-warm-cream">
                    <div className="max-w-7xl mx-auto px-6 pt-8 pb-10">
                        <div className="flex items-center gap-2 text-xs text-warm-cream/40 mb-4">
                            <a href="/" className="hover:text-warm-cream/70 transition-colors">Home</a>
                            <span>/</span>
                            <span className="text-warm-cream/70">Shop</span>
                        </div>
                        <h1 className="font-serif text-3xl md:text-4xl font-bold">{getText(ct, "shop.heading")}</h1>
                        <p className="text-warm-cream/50 mt-2 text-sm md:text-base">{getText(ct, "shop.desc")}</p>
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
