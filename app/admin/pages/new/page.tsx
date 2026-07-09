"use client";

import { useState } from "react";
import { createPage } from "@/lib/queries";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import RichTextEditor from "@/components/modules/RichTextEditor";

export default function NewPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("<p>Start writing your page content here…</p>");
    const [isPublished, setIsPublished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!title || !slug) {
            toast.error("Title and Slug are required");
            return;
        }

        setIsSaving(true);
        try {
            await createPage({ title, slug, content, isPublished });
            toast.success("Page created successfully!");
            router.push("/admin/pages");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create page");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <h1 className="text-3xl font-serif text-warm-cream">Create New Page</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-warm-cream/60 mb-1">Page Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setSlug(
                                e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, "-")
                                    .replace(/(^-|-$)/g, ""),
                            );
                        }}
                        className="w-full border border-warm-cream/15 rounded-md p-2 bg-raised text-warm-cream"
                        placeholder="e.g. About Us"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-warm-cream/60 mb-1">Slug (URL)</label>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full border border-warm-cream/15 rounded-md p-2 bg-raised text-warm-cream"
                        placeholder="e.g. about-us"
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
                    {isSaving ? "Creating…" : "Create Page"}
                </button>
            </div>
        </div>
    );
}
