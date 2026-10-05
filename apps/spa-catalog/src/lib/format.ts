import { CATEGORIES } from "@catalog/data";

export { CATEGORIES, formatPrice } from "@catalog/data";

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
