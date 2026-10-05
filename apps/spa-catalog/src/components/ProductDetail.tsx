import { Link } from "@tanstack/react-router";
import type { Product, User } from "@catalog/data";
import { categoryLabel, formatPrice } from "#/lib/format";
import { ReserveForm } from "./ReserveForm";

export function ProductDetail({ product, user, onReserved }: { product: Product; user: User | null; onReserved?: (p: Product) => void }) {
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <img src={`/images/${product.id}.png`} alt={product.name} width={640} height={400} className="w-full rounded-lg border" />
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          <Link to="/" search={{ category: product.category }} className="hover:underline">
            {categoryLabel(product.category)}
          </Link>
          {" · "}
          {product.origin}
        </p>
        <h1 className="text-2xl font-bold" data-testid="product-name">
          {product.name}
        </h1>
        <p className="text-xl" data-testid="product-price">
          {formatPrice(product.price)} <span className="text-sm text-zinc-500">/ {product.unit}</span>
        </p>
        <p className="text-zinc-700">{product.description}</p>
        <p className="text-sm" data-testid="product-stock">
          {product.stock > 0 ? `在庫 ${product.stock}` : "在庫切れ"}
        </p>
        <ReserveForm product={product} user={user} onReserved={onReserved} />
      </div>
    </article>
  );
}
