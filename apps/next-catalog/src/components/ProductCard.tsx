import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@catalog/data";

export function ProductCard({ product }: { product: Product }) {
  return (
    <li
      data-testid="product-card"
      className="overflow-hidden rounded-lg border bg-white shadow-sm"
    >
      <Link href={`/products/${product.id}`} className="block">
        <Image
          src={`/images/${product.id}.png`}
          alt={product.name}
          width={640}
          height={400}
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
