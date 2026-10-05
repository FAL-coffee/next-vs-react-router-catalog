import { getProduct } from "@catalog/data";
import type { Route } from "./+types/api.product";

export function loader({ params }: Route.LoaderArgs) {
  const product = getProduct(params.id);
  if (!product) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json({ product });
}
