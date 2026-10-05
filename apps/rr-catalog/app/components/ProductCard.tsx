import { Link } from "react-router";
import { formatPrice, type Product } from "@catalog/data";

export function ProductCard({ product }: { product: Product }) {
  return (
    <li
      data-testid="product-card"
      className="overflow-hidden rounded-lg border bg-white shadow-sm"
    >
      <Link to={`/products/${product.id}`} className="block">
        <img
          src={`/images/${product.id}.png`}
          alt={product.name}
          width={640}
          height={400}
          loading="lazy"
          className="aspect-[16/10] w-full object-cover"
        />
        <div className="space-y-1 p-3">
          <h2 className="font-medium" data-testid="product-name">
            {product.name}
          </h2>
          <p className="text-sm text-zinc-600">
            {formatPrice(product.price)} / {product.unit}
          </p>
          <p className="text-xs text-zinc-500" data-testid="product-stock">
            {product.stock > 0 ? `在庫 ${product.stock}` : "在庫切れ"}
          </p>
        </div>
      </Link>
    </li>
  );
}
