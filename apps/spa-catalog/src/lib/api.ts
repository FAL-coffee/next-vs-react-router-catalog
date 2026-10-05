/**
 * The SPA's "data access". In this comparison it calls the shared mock data
 * layer directly in the browser (same artificial latency as Next's server-side
 * calls). In a real product this file is where `fetch` to the BFF would live.
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
