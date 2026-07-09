"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose-base focus:outline-none min-h-[150px] px-4 py-3 text-warm-cream max-w-none",
            },
        },
        immediatelyRender: false,
    });

    if (!editor) return null;

    return (
        <div className="border border-warm-cream/30 rounded-sm overflow-hidden bg-raised focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green transition-all">
            <div className="flex flex-wrap items-center gap-1 border-b border-warm-cream/10 bg-[#111] p-2">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    label="B"
                    title="Bold"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    label="I"
                    title="Italic"
                />
                <div className="w-px h-4 bg-warm-cream/20 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive("heading", { level: 2 })}
                    label="H2"
                    title="Heading 2"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive("heading", { level: 3 })}
                    label="H3"
                    title="Heading 3"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    label="• List"
                    title="Bullet List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    label="1. List"
                    title="Ordered List"
                />
                <div className="w-px h-4 bg-warm-cream/20 mx-1" />
                <ToolbarButton
                    onClick={() => {
                        const prev = editor.getAttributes("link").href as string | undefined;
                        const url = window.prompt("Link URL (leave blank to remove)", prev ?? "");
                        if (url === null) return; // cancelled
                        if (url === "") {
                            editor.chain().focus().extendMarkRange("link").unsetLink().run();
                            return;
                        }
                        editor
                            .chain()
                            .focus()
                            .extendMarkRange("link")
                            .setLink({ href: url })
                            .run();
                    }}
                    isActive={editor.isActive("link")}
                    label="Link"
                    title="Add / edit link"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    isActive={false}
                    label="Unlink"
                    title="Remove link"
                />
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

function ToolbarButton({
    onClick,
    isActive,
    label,
    title,
}: {
    onClick: () => void;
    isActive: boolean;
    label: string;
    title: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`px-2 py-1 text-xs font-medium rounded hover:bg-warm-cream/20 transition-colors ${isActive ? "bg-warm-cream/20 text-brand-green" : "text-warm-cream/70"
                }`}
        >
            {label}
        </button>
    );
}
