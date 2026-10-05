import { listProducts } from "@catalog/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const products = await listProducts({
    q: url.searchParams.get("q"),
    category: url.searchParams.get("category"),
  });
  return Response.json({ products });
}
