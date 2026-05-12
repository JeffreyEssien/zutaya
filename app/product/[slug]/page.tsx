import { notFound } from "next/navigation";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import ProductPageShell from "@/components/modules/ProductPageShell";
import YouMayAlsoLike from "@/components/modules/YouMayAlsoLike";
import { getProductBySlug, getProducts, getSiteSettings } from "@/lib/queries";
import { getMarinades, getProcessingOptions } from "@/lib/servicesQueries";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
    const { slug } = await params;
    const [product, allProducts, marinades, processingOptions, settings] = await Promise.all([
        getProductBySlug(slug),
        getProducts(),
        getMarinades(true),
        getProcessingOptions(true),
        getSiteSettings(),
    ]);
    if (!product) return notFound();

    return (
        <>
            <Header />
            <main className="max-w-7xl mx-auto px-6 pt-4 pb-8">
                <ProductPageShell
                    product={product}
                    marinades={marinades}
                    processingOptions={processingOptions}
                    eventsEnabled={settings?.eventsEnabled !== false}
                />
            </main>
            <YouMayAlsoLike currentProduct={product} allProducts={allProducts} />
            <Footer />
        </>
    );
}
