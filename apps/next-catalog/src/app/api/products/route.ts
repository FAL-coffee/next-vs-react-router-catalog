import { listProducts } from "@catalog/data";

export function GET(request: Request) {
  const url = new URL(request.url);
  const products = listProducts({
    q: url.searchParams.get("q"),
    category: url.searchParams.get("category"),
  });
  return Response.json({ products });
}
