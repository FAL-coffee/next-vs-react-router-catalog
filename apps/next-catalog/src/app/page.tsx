import { listProducts } from "@catalog/data";
import { ProductCard } from "@/components/ProductCard";
import { SearchForm } from "@/components/SearchForm";

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = first(sp.q);
  const category = first(sp.category);
  const products = await listProducts({ q, category });

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
