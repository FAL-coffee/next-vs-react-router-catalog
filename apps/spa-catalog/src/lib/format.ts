// Kept local on purpose: importing the value exports of @catalog/data would
// pull products.json and the auth code into the browser bundle.
import type { Category } from "@catalog/data";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "coffee", label: "コーヒー豆" },
  { value: "tea", label: "お茶" },
  { value: "equipment", label: "器具" },
];

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
