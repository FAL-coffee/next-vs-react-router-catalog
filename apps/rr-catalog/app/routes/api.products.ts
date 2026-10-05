import { listProducts } from "@catalog/data";
import type { Route } from "./+types/api.products";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const products = listProducts({
    q: url.searchParams.get("q"),
    category: url.searchParams.get("category"),
  });
  return Response.json({ products });
}
