import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@catalog/data";
import { getSession } from "@/lib/session";
import { ProductDetail } from "@/components/ProductDetail";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  return { title: product ? product.name : "Not Found" };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (sp.fail === "1") {
    throw new Error("Intentional failure for error-boundary comparison");
  }
  const product = getProduct(id);
  if (!product) notFound();
  const user = await getSession();

  return (
    <div className="space-y-6">
      <ProductDetail product={product} user={user} priority />
      <Link href="/" className="inline-block text-sm text-zinc-600 hover:underline">
        ← 一覧に戻る
      </Link>
    </div>
  );
}
