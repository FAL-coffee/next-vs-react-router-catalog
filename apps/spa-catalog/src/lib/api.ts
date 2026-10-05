import type { Product, ReservationStat, User } from "@catalog/data";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error?: string; message?: string },
  ) {
    super(body.message ?? body.error ?? `HTTP ${status}`);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const listProducts = (q: { q?: string; category?: string }) => {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.category) sp.set("category", q.category);
  const qs = sp.toString();
  return api<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ""}`).then((r) => r.products);
};

export const getProduct = (id: string) => api<{ product: Product }>(`/api/products/${id}`).then((r) => r.product);

export const reserve = (id: string, quantity: number) =>
  api<{ status: "ok"; message: string; product: Product }>(`/api/products/${id}/reserve`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });

export const login = (id: string, password: string) =>
  api<{ user: User }>("/api/login", { method: "POST", body: JSON.stringify({ id, password }) }).then((r) => r.user);

export const logout = () => api<{ ok: true }>("/api/logout", { method: "POST" });

export const adminStats = () => api<{ stats: ReservationStat[] }>("/api/admin/stats").then((r) => r.stats);

// Session is read once per page load and after login/logout; the API is the
// source of truth, this is just a client-side cache for route guards.
let mePromise: Promise<User | null> | null = null;
export function me(): Promise<User | null> {
  mePromise ??= api<{ user: User }>("/api/me")
    .then((r) => r.user)
    .catch((e) => (e instanceof ApiError && e.status === 401 ? null : Promise.reject(e)));
  return mePromise;
}
export function invalidateMe() {
  mePromise = null;
}
