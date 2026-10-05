import rawProducts from "./products.json";

export type Category = "coffee" | "tea" | "equipment";

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  unit: string;
  stock: number;
  origin: string;
  description: string;
};

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "coffee", label: "コーヒー豆" },
  { value: "tea", label: "お茶" },
  { value: "equipment", label: "器具" },
];

const products: Product[] = rawProducts as Product[];

/**
 * In-memory reservation ledger. No database on purpose: both apps share this
 * module and keep state per server process, which is enough for a demo and
 * keeps the comparison about the framework, not about data access.
 */
const reserved: Map<string, number> = ((globalThis as any).__catalogReserved ??=
  new Map<string, number>());
// `globalThis` rather than a plain module-level Map: Next.js bundles server
// code per route, so a module-level singleton can be instantiated once per
// route chunk. Vite SSR builds produce a single server bundle, so React Router
// would be fine with a plain Map. Same trick people use for Prisma clients.

function withStock(p: Product): Product {
  return { ...p, stock: Math.max(0, p.stock - (reserved.get(p.id) ?? 0)) };
}

export type ListQuery = { q?: string | null; category?: string | null };

export function listProducts(query: ListQuery = {}): Product[] {
  const q = (query.q ?? "").trim().toLowerCase();
  const category = query.category ?? "";
  return products
    .filter((p) => (category ? p.category === category : true))
    .filter((p) =>
      q
        ? [p.name, p.origin, p.description, p.id].some((s) =>
            s.toLowerCase().includes(q),
          )
        : true,
    )
    .map(withStock);
}

export function getProduct(id: string): Product | undefined {
  const p = products.find((p) => p.id === id);
  return p ? withStock(p) : undefined;
}

export type ReserveResult =
  | { ok: true; product: Product; quantity: number }
  | { ok: false; error: string };

export function reserveProduct(id: string, quantity: number): ReserveResult {
  const product = getProduct(id);
  if (!product) return { ok: false, error: "商品が見つかりません" };
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "数量は1以上の整数で指定してください" };
  }
  if (product.stock < quantity) {
    return { ok: false, error: `在庫が足りません（残り ${product.stock}）` };
  }
  reserved.set(id, (reserved.get(id) ?? 0) + quantity);
  return { ok: true, product: getProduct(id)!, quantity };
}

export function resetReservations(): void {
  reserved.clear();
}

export type ReservationStat = { productId: string; name: string; reserved: number; remaining: number };

/** Admin-only view of what has been reserved in this process. */
export function reservationStats(): ReservationStat[] {
  return products.map((p) => ({
    productId: p.id,
    name: p.name,
    reserved: reserved.get(p.id) ?? 0,
    remaining: withStock(p).stock,
  }));
}

export * from "./auth";

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}
