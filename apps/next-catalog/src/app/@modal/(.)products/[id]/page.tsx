import { getProduct } from "@catalog/data";
import { ProductDetail } from "@/components/ProductDetail";
import { Modal } from "./Modal";

/**
 * Intercepting Route。一覧からのクライアント遷移で /products/[id] に行くと
 * 一覧の上にこのモーダルを重ねて描画する。リロードや直接アクセスの場合は
 * app/products/[id]/page.tsx の本物の詳細ページが描画される。
 */
export default async function QuickViewModal({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  return (
    <Modal>
      {product ? (
        <>
          <ProductDetail product={product} />
          {/* Intercepting Route はソフトナビゲーションにしか効かず、同じ URL への
              <Link> はモーダルのまま何も起きない。本物の詳細ページを出すには
              素の <a> でハードナビゲーションするしかない。 */}
          <a href={`/products/${id}`} className="mt-4 inline-block text-sm underline">
            詳細ページで開く
          </a>
        </>
      ) : (
        <p>商品が見つかりません。</p>
      )}
    </Modal>
  );
}
