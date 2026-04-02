import { getCategories } from "@/lib/queries";

export async function GET() {
    const categories = await getCategories();
    return Response.json(categories);
}
