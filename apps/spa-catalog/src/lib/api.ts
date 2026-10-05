/**
 * SPA の「データアクセス」。この比較では共有のモックデータ層をブラウザで
 * 直接呼ぶ（Next 側のサーバ呼び出しと同じ擬似レイテンシ）。実運用なら
 * このファイルが BFF への `fetch` を置く場所になる。
 */
import { getProduct as mockGetProduct, listProducts as mockListProducts, reserveProduct } from "@catalog/data";
import type { Product } from "@catalog/data";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const listProducts = (q: { q?: string; category?: string }): Promise<Product[]> => mockListProducts(q);

export const getProduct = async (id: string): Promise<Product> => {
  const product = await mockGetProduct(id);
  if (!product) throw new ApiError(404, "not_found");
  return product;
};

export const reserve = async (id: string, quantity: number): Promise<{ message: string; product: Product }> => {
  const result = await reserveProduct(id, quantity);
  if (!result.ok) throw new ApiError(400, result.error);
  return {
    message: `${result.product.name} を ${result.quantity} 点予約しました（残り ${result.product.stock}）`,
    product: result.product,
  };
};
