import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import ProductPageShell from "@/components/modules/ProductPageShell";
import ProductReviews from "@/components/modules/ProductReviews";
import FrequentlyBoughtTogether from "@/components/modules/FrequentlyBoughtTogether";
import YouMayAlsoLike from "@/components/modules/YouMayAlsoLike";
import { getProductBySlug, getProducts, getSiteSettings, getProductRedirect } from "@/lib/queries";
import { getApprovedReviews, getReviewSummary } from "@/lib/reviews";
import { getFrequentlyBoughtTogether } from "@/lib/recommendations";
import { getMarinades, getProcessingOptions } from "@/lib/servicesQueries";
import JsonLd from "@/components/JsonLd";
import { productMetaDescription, productSchema, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Product not found" };

    const description = productMetaDescription(product);
    const images = (product.images || []).filter(Boolean);
    const canonical = `/product/${product.slug}`;

    return {
        title: product.name,
        description,
        alternates: { canonical },
        openGraph: {
            title: `${product.name} | Zúta Ya`,
            description,
            url: canonical,
            type: "website",
            images: images.length ? images.map((url) => ({ url })) : undefined,
        },
        twitter: images.length
            ? { card: "summary_large_image", title: product.name, description, images }
            : undefined,
    };
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
    if (!product) {
        // Deleted product? 301 to its recorded target (category/shop) to keep SEO equity.
        const redirectTo = await getProductRedirect(slug);
        if (redirectTo) permanentRedirect(redirectTo);
        return notFound();
    }

    const [reviews, reviewSummary, fbtIds] = await Promise.all([
        getApprovedReviews(product.id),
        getReviewSummary(product.id),
        getFrequentlyBoughtTogether(product.id, 3),
    ]);

    // Resolve FBT ids → in-stock products; backfill with same-category so it's
    // never empty for a new store with little order history.
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    const inStock = (p: typeof product) => p.stock > 0 && p.id !== product.id;
    const fbtSuggestions = fbtIds
        .map((f) => byId.get(f.productId))
        .filter((p): p is typeof product => !!p && inStock(p));
    if (fbtSuggestions.length < 3) {
        const have = new Set(fbtSuggestions.map((p) => p.id));
        const backfill = allProducts.filter((p) => inStock(p) && p.category === product.category && !have.has(p.id));
        fbtSuggestions.push(...backfill.slice(0, 3 - fbtSuggestions.length));
    }

    return (
        <>
            <JsonLd
                data={[
                    productSchema(product, reviewSummary.count > 0 ? { average: reviewSummary.average, count: reviewSummary.count } : undefined),
                    breadcrumbSchema([
                        { name: "Home", path: "/" },
                        { name: "Shop", path: "/shop" },
                        { name: product.name, path: `/product/${product.slug}` },
                    ]),
                ]}
            />
            <Header />
            <main className="max-w-7xl mx-auto px-6 pt-4 pb-8">
                <ProductPageShell
                    product={product}
                    marinades={marinades}
                    processingOptions={processingOptions}
                    eventsEnabled={settings?.eventsEnabled !== false}
                    reviewSummary={reviewSummary}
                />
            </main>
            {fbtSuggestions.length > 0 && <FrequentlyBoughtTogether suggestions={fbtSuggestions} />}
            <ProductReviews
                productId={product.id}
                productName={product.name}
                initialReviews={reviews}
                summary={reviewSummary}
            />
            <YouMayAlsoLike currentProduct={product} allProducts={allProducts} />
            <Footer />
        </>
    );
}
