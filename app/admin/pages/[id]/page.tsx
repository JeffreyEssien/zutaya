"use client";

import { useState, useEffect, use } from "react";
import { getPageById, updatePage } from "@/lib/queries";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import RichTextEditor from "@/components/modules/RichTextEditor";

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [isPublished, setIsPublished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPage = async () => {
            const page = await getPageById(id);
            if (page) {
                setTitle(page.title);
                setSlug(page.slug);
                setIsPublished(page.isPublished);
                setContent(typeof page.content === "string" ? page.content : "");
            } else {
                toast.error("Page not found");
                router.push("/admin/pages");
            }
            setIsLoading(false);
        };
        loadPage();
    }, [id, router]);

    const handleSave = async () => {
        if (!title || !slug) {
            toast.error("Title and Slug are required");
            return;
        }

        setIsSaving(true);
        try {
            await updatePage(id, { title, slug, content, isPublished });
            toast.success("Page updated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update page");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-warm-cream/60">Loading…</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <h1 className="text-3xl font-serif text-warm-cream">Edit Page</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-warm-cream/60 mb-1">Page Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border border-warm-cream/15 rounded-md p-2 bg-raised text-warm-cream"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-warm-cream/60 mb-1">Slug (URL)</label>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full border border-warm-cream/15 rounded-md p-2 bg-raised text-warm-cream"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-warm-cream/60 mb-1">Content</label>
                <RichTextEditor value={content} onChange={setContent} />
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isPublished}
                        onChange={(e) => setIsPublished(e.target.checked)}
                        className="rounded text-warm-cream focus:ring-warm-cream"
                    />
                    <span className="text-sm font-medium text-warm-cream/60">Publish immediately</span>
                </label>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-warm-cream/15 rounded-md text-warm-cream/60 hover:bg-warm-cream/[0.03] bg-base"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-brand-dark text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                    {isSaving ? "Saving…" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
