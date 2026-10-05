import { createFileRoute, notFound } from "@tanstack/react-router";
import { ApiError, getProduct } from "#/lib/api";
import { ProductDetail } from "#/components/ProductDetail";

export const Route = createFileRoute("/products/$id")({
  // TanStack parses search values as JSON, so `?fail=1` arrives as the number 1.
  validateSearch: (s: Record<string, unknown>): { fail?: string } => (s.fail != null ? { fail: String(s.fail) } : {}),
  loaderDeps: ({ search }) => ({ fail: search.fail }),
  loader: async ({ params, deps }) => {
    if (deps.fail === "1") throw new Error("Intentional failure for error-boundary comparison");
    try {
      return await getProduct(params.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) throw notFound();
      throw e;
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? "Not Found"} | Catalog (TanStack Router SPA)` }] }),
  component: ProductPage,
});

function ProductPage() {
  const product = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return <ProductDetail product={product} user={user} />;
}
