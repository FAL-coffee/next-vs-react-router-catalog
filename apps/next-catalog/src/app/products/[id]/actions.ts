"use server";

import { can, reserveProduct } from "@catalog/data";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export type ReserveState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

export async function reserveAction(_prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const user = await getSession();
  if (!can(user, "reserve")) return { status: "error", message: "予約にはログインが必要です" };
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
