import Link from "next/link";
import { getProduct } from "@catalog/data";
import { ProductDetail } from "@/components/ProductDetail";
import { Modal } from "./Modal";

/**
 * Intercepting route: a client-side navigation from the list to
 * /products/[id] renders this modal on top of the list; a hard reload or a
 * direct visit renders the real page at app/products/[id]/page.tsx.
 */
export default async function QuickViewModal({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  return (
    <Modal>
      {product ? (
        <>
          <ProductDetail product={product} />
          <Link href={`/products/${id}`} className="mt-4 inline-block text-sm underline">
            詳細ページで開く
          </Link>
        </>
      ) : (
        <p>商品が見つかりません。</p>
      )}
    </Modal>
  );
}
