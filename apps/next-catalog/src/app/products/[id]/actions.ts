"use server";

import { reserveProduct } from "@catalog/data";
import { revalidatePath } from "next/cache";

export type ReserveState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

export async function reserveAction(
  _prev: ReserveState,
  formData: FormData,
): Promise<ReserveState> {
  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const result = reserveProduct(id, quantity);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/products/${id}`);
  revalidatePath("/");
  return {
    status: "ok",
    message: `${result.product.name} を ${result.quantity} 点予約しました（残り ${result.product.stock}）`,
  };
}
