import { getPageBySlug } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import { SITE_NAME } from "@/lib/constants";
import { absoluteUrl, stripHtml, truncate } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const page = await getPageBySlug(slug);
    if (!page) return {};
    const description = truncate(
        stripHtml(typeof page.content === "string" ? page.content : ""),
        160,
    );
    const url = absoluteUrl(`/${slug}`);
    return {
        title: page.title,
        description: description || undefined,
        alternates: { canonical: url },
        openGraph: { title: page.title, description: description || undefined, url, type: "article" },
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
            <main className="min-h-screen bg-base">
                {/* Title band */}
                <div className="border-b border-line">
                    <div className="max-w-3xl mx-auto px-5 sm:px-6 pt-12 pb-8 sm:pt-16 sm:pb-10 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-brown mb-3">
                            {SITE_NAME}
                        </p>
                        <h1 className="text-[26px] leading-tight sm:text-4xl font-serif text-warm-cream">
                            {page.title}
                        </h1>
                    </div>
                </div>

                {/* Content card */}
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <article
                        className="bg-surface border border-line rounded-2xl px-5 py-8 sm:px-9 sm:py-10 text-warm-cream text-[15px] sm:text-base leading-7 break-words [&_h2]:font-serif [&_h2]:text-warm-cream [&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-semibold [&_h2]:mt-9 [&_h2]:sm:mt-10 [&_h2]:first:mt-0 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-line [&_h3]:font-serif [&_h3]:text-warm-cream [&_h3]:text-base [&_h3]:sm:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-warm-cream [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:sm:pl-6 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:sm:pl-6 [&_ol]:mb-4 [&_ol]:space-y-2 [&_li]:text-warm-cream [&_li]:pl-1.5 [&_li]:marker:text-brand-red [&_strong]:text-warm-cream [&_strong]:font-semibold [&_em]:not-italic [&_em]:text-muted-brown [&_em]:text-sm [&_a]:font-medium [&_a]:text-brand-red [&_a]:underline [&_a]:decoration-brand-red [&_a]:decoration-2 [&_a]:underline-offset-[3px] [&_a]:transition-colors hover:[&_a]:text-brand-red/80"
                        dangerouslySetInnerHTML={{ __html: typeof page.content === "string" ? page.content : "" }}
                    />
                    <div className="mt-8 text-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-sm text-muted-brown hover:text-warm-cream transition-colors"
                        >
                            <span aria-hidden>←</span> Back to home
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
