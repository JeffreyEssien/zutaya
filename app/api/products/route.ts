import { getProducts } from "@/lib/queries";

export async function GET() {
    const products = await getProducts();
    return Response.json(products);
}
