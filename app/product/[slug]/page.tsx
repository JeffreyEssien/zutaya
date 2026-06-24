import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import ProductPageShell from "@/components/modules/ProductPageShell";
import YouMayAlsoLike from "@/components/modules/YouMayAlsoLike";
import { getProductBySlug, getProducts, getSiteSettings } from "@/lib/queries";
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
    if (!product) return notFound();

    return (
        <>
            <JsonLd
                data={[
                    productSchema(product),
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
                />
            </main>
            <YouMayAlsoLike currentProduct={product} allProducts={allProducts} />
            <Footer />
        </>
    );
}
