import { getProduct } from "@catalog/data";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/products/[id]">,
) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json({ product });
}
