"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { useState, useEffect } from "react";
import { getPageById, updatePage } from "@/lib/queries";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Page } from "@/types";

import { use } from "react";

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [isPublished, setIsPublished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const editor = useEditor({
        extensions: [
            StarterKit,
            LinkExtension.configure({
                openOnClick: false,
            }),
        ],
        content: "", // Initial load handled in useEffect
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[300px] p-4 border rounded-md border-warm-cream/10",
            },
        },
    });

    useEffect(() => {
        const loadPage = async () => {
            const page = await getPageById(id);
            if (page) {
                setTitle(page.title);
                setSlug(page.slug);
                setIsPublished(page.isPublished);
                if (editor) {
                    editor.commands.setContent(page.content);
                }
            } else {
                toast.error("Page not found");
                router.push("/admin/pages");
            }
            setIsLoading(false);
        };
        loadPage();
    }, [id, editor, router]);

    const handleSave = async () => {
        if (!title || !slug) {
            toast.error("Title and Slug are required");
            return;
        }

        setIsSaving(true);
        try {
            await updatePage(id, {
                title,
                slug,
                content: editor?.getHTML(),
                isPublished,
            });
            toast.success("Page updated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update page");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div>Loading...</div>;

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
                        className="w-full border border-warm-cream/15 rounded-md p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-warm-cream/60 mb-1">Slug (URL)</label>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full border border-warm-cream/15 rounded-md p-2"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-warm-cream/60 mb-1">Content</label>
                <div className="bg-white/[0.04] rounded-md">
                    <div className="border-b border-warm-cream/10 p-2 flex gap-2">
                        <button
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            className={`px-2 py-1 rounded ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
                        >
                            Bold
                        </button>
                        <button
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            className={`px-2 py-1 rounded ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
                        >
                            Italic
                        </button>
                        <button
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={`px-2 py-1 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
                        >
                            H2
                        </button>
                    </div>
                    <EditorContent editor={editor} />
                </div>
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
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-warm-cream/15 rounded-md text-warm-cream/60 hover:bg-warm-cream/[0.03] bg-[#1e1e1e]"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-brand-dark text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
