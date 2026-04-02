import { getPageBySlug } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const page = await getPageBySlug(slug);
    if (!page) return {};
    return {
        title: `${page.title} | Zúta Ya`,
    };
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const page = await getPageBySlug(slug);

    if (!page) {
        notFound();
    }

    return (
        <>
            <Header />
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-serif text-brand-dark mb-8 text-center">{page.title}</h1>
                <div
                    className="prose prose-lg mx-auto"
                    dangerouslySetInnerHTML={{ __html: typeof page.content === "string" ? page.content : "" }}
                />
            </main>
            <Footer />
        </>
    );
}
