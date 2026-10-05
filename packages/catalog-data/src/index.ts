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
 * 両アプリが共有するモックのデータ層。どの呼び出しも同じ擬似レイテンシを
 * 待ってから返すので、Next のサーバで動いても SPA のブラウザで動いても
 * 「データアクセス」のコストは完全に同じになる。DB もネットワークも無し。
 */
export const MOCK_LATENCY_MS = 150;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * インメモリの予約台帳。Next ではサーバプロセス内に置かれる（Next はサーバ
 * コードをルート単位でバンドルするためモジュールスコープのシングルトンが
 * チャンクごとに複製されうるので、`globalThis` に逃がしている）。SPA では
 * ブラウザのタブ内に置かれる。
 */
const reserved: Map<string, number> = ((globalThis as any).__catalogReserved ??= new Map<string, number>());

function withStock(p: Product): Product {
  return { ...p, stock: Math.max(0, p.stock - (reserved.get(p.id) ?? 0)) };
}

export type ListQuery = { q?: string | null; category?: string | null };

export async function listProducts(query: ListQuery = {}): Promise<Product[]> {
  await sleep(MOCK_LATENCY_MS);
  const q = (query.q ?? "").trim().toLowerCase();
  const category = query.category ?? "";
  return products
    .filter((p) => (category ? p.category === category : true))
    .filter((p) =>
      q ? [p.name, p.origin, p.description, p.id].some((s) => s.toLowerCase().includes(q)) : true,
    )
    .map(withStock);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  await sleep(MOCK_LATENCY_MS);
  const p = products.find((p) => p.id === id);
  return p ? withStock(p) : undefined;
}

export type ReserveResult =
  | { ok: true; product: Product; quantity: number }
  | { ok: false; error: string };

export async function reserveProduct(id: string, quantity: number): Promise<ReserveResult> {
  await sleep(MOCK_LATENCY_MS);
  const p = products.find((p) => p.id === id);
  if (!p) return { ok: false, error: "商品が見つかりません" };
  const product = withStock(p);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "数量は1以上の整数で指定してください" };
  }
  if (product.stock < quantity) {
    return { ok: false, error: `在庫が足りません（残り ${product.stock}）` };
  }
  reserved.set(id, (reserved.get(id) ?? 0) + quantity);
  return { ok: true, product: withStock(p), quantity };
}

export function resetReservations(): void {
  reserved.clear();
}

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}
