import { getPages, deletePage } from "@/lib/queries";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default async function PagesPage() {
    const pages = await getPages();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-serif text-warm-cream">CMS Pages</h1>
                <Link href="/admin/pages/new" className="bg-brand-dark text-white px-4 py-2 rounded hover:bg-gray-800 transition">
                    Create New Page
                </Link>
            </div>

            <div className="bg-white/[0.04] rounded-lg shadow overflow-hidden border border-warm-cream/20">
                <table className="w-full text-left text-sm">
                    <thead className="bg-brand-creme text-warm-cream">
                        <tr>
                            <th className="p-4 font-medium">Title</th>
                            <th className="p-4 font-medium">Slug</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Last Updated</th>
                            <th className="p-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-cream/10">
                        {pages.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-warm-cream/40">
                                    No pages found. Create one!
                                </td>
                            </tr>
                        ) : (
                            pages.map((page) => (
                                <tr key={page.id} className="hover:bg-brand-creme/20">
                                    <td className="p-4 font-medium text-warm-cream">{page.title}</td>
                                    <td className="p-4 text-warm-cream/50">/{page.slug}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${page.isPublished ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                            {page.isPublished ? "Published" : "Draft"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-warm-cream/40">
                                        {new Date(page.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <Link href={`/admin/pages/${page.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            Edit
                                        </Link>
                                        {/* Delete requires client component or form action. Simplified for now. */}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
