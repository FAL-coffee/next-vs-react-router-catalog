import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, formatPrice, getProduct } from "@catalog/data";
import { ReserveForm } from "./ReserveForm";

export async function generateMetadata({
  params,
}: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  return { title: product ? product.name : "Not Found" };
}

export default async function ProductPage({
  params,
  searchParams,
}: PageProps<"/products/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (sp.fail === "1") {
    throw new Error("Intentional failure for error-boundary comparison");
  }
  const product = getProduct(id);
  if (!product) notFound();

  const categoryLabel =
    CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <Image
        src={`/images/${product.id}.png`}
        alt={product.name}
        width={640}
        height={400}
        priority
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
          {formatPrice(product.price)}{" "}
          <span className="text-sm text-zinc-500">/ {product.unit}</span>
        </p>
        <p className="text-zinc-700">{product.description}</p>
        <p className="text-sm" data-testid="product-stock">
          {product.stock > 0 ? `在庫 ${product.stock}` : "在庫切れ"}
        </p>
        <ReserveForm id={product.id} stock={product.stock} />
        <Link href="/" className="inline-block text-sm text-zinc-600 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>
    </article>
  );
}
