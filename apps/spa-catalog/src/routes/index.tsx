import { createFileRoute } from "@tanstack/react-router";
import { listProducts } from "#/lib/api";
import { ProductCard } from "#/components/ProductCard";
import { SearchForm } from "#/components/SearchForm";
import { QuickView } from "#/components/QuickView";

type Search = { q?: string; category?: string; quick?: string };

export const Route = createFileRoute("/")({
  // Every key optional so that a plain <Link to="/"> needs no `search` prop.
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
    ...(typeof s.category === "string" && s.category ? { category: s.category } : {}),
    ...(typeof s.quick === "string" ? { quick: s.quick } : {}),
  }),
  loaderDeps: ({ search }) => ({ q: search.q ?? "", category: search.category ?? "" }),
  loader: ({ deps }) => listProducts(deps),
  head: () => ({ meta: [{ title: "Catalog (TanStack Router SPA)" }] }),
  component: HomePage,
});

function HomePage() {
  const products = Route.useLoaderData();
  const { q = "", category = "", quick } = Route.useSearch();
  const { user } = Route.useRouteContext();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">商品カタログ</h1>
      <SearchForm q={q} category={category} />
      <p className="text-sm text-zinc-600" data-testid="result-count">
        {products.length} 件
      </p>
      {products.length === 0 ? (
        <p data-testid="empty">該当する商品がありません。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} search={{ q, category }} />
          ))}
        </ul>
      )}
      {quick && <QuickView id={quick} user={user} search={{ q, category }} />}
    </div>
  );
}
