import Image from "next/image";
import Link from "next/link";
import { CATEGORIES, formatPrice, type Product } from "@catalog/data";
import { ReserveForm } from "@/app/products/[id]/ReserveForm";

export function ProductDetail({ product, priority }: { product: Product; priority?: boolean }) {
  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <Image
        src={`/images/${product.id}.png`}
        alt={product.name}
        width={640}
        height={400}
        priority={priority}
        className="w-full rounded-lg border"
      />
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          <Link href={`/?category=${product.category}`} className="hover:underline">
            {categoryLabel}
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
        <ReserveForm id={product.id} stock={product.stock} />
      </div>
    </article>
  );
}
