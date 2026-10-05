import { listProducts } from "@catalog/data";
import type { Route } from "./+types/home";
import { ProductCard } from "~/components/ProductCard";
import { SearchForm } from "~/components/SearchForm";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Catalog (React Router)" },
    { name: "description", content: "Next.js vs React Router comparison catalog" },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category") ?? "";
  return { q, category, products: listProducts({ q, category }) };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { q, category, products } = loaderData;
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
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
