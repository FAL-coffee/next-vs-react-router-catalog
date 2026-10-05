/**
 * The JSON API behind the SPA, as a plain Hono app. Hosted two ways:
 *   - server.ts: Node http server for local use (also serves the SPA build)
 *   - vercel.ts: Vercel serverless function (bundled into apps/spa-catalog/api/)
 */
import { Hono } from "hono";
import { getProduct, listProducts, reserveProduct } from "@catalog/data";

export const app = new Hono();

app.get("/api/products", (c) =>
  c.json({ products: listProducts({ q: c.req.query("q"), category: c.req.query("category") }) }),
);

app.get("/api/products/:id", (c) => {
  const product = getProduct(c.req.param("id"));
  return product ? c.json({ product }) : c.json({ error: "not_found" }, 404);
});

app.post("/api/products/:id/reserve", async (c) => {
  const body = await c.req.json<{ quantity?: number }>().catch(() => ({}) as { quantity?: number });
  const result = reserveProduct(c.req.param("id"), Number(body.quantity ?? 0));
  if (!result.ok) return c.json({ status: "error", message: result.error }, 400);
  return c.json({
    status: "ok",
    message: `${result.product.name} を ${result.quantity} 点予約しました（残り ${result.product.stock}）`,
    product: result.product,
  });
});

app.notFound((c) => c.json({ error: "not_found" }, 404));
