/**
 * The API behind the SPA. Also serves the built SPA so that one process is
 * enough locally; in production the static files would sit on a CDN and only
 * this JSON API would run.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { getRequestListener } from "@hono/node-server";
import {
  authenticate,
  can,
  getProduct,
  listProducts,
  readCookie,
  reservationStats,
  reserveProduct,
  sessionCookieAttributes,
  SESSION_COOKIE,
  signSession,
  verifySession,
  type User,
} from "@catalog/data";

type Env = { Variables: { user: User | null } };

const app = new Hono<Env>();

// ---- session ----
app.use("/api/*", async (c, next) => {
  c.set("user", await verifySession(readCookie(c.req.header("cookie"), SESSION_COOKIE)));
  await next();
});

const requireUser = (action: Parameters<typeof can>[1]) => async (c: any, next: any) => {
  const user = c.get("user") as User | null;
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!can(user, action)) return c.json({ error: "forbidden" }, 403);
  await next();
};

// ---- catalog ----
app.get("/api/products", (c) =>
  c.json({ products: listProducts({ q: c.req.query("q"), category: c.req.query("category") }) }),
);

app.get("/api/products/:id", (c) => {
  const product = getProduct(c.req.param("id"));
  return product ? c.json({ product }) : c.json({ error: "not_found" }, 404);
});

app.post("/api/products/:id/reserve", requireUser("reserve"), async (c) => {
  const body = await c.req.json<{ quantity?: number }>().catch(() => ({}) as { quantity?: number });
  const result = reserveProduct(c.req.param("id"), Number(body.quantity ?? 0));
  if (!result.ok) return c.json({ status: "error", message: result.error }, 400);
  return c.json({
    status: "ok",
    message: `${result.product.name} を ${result.quantity} 点予約しました（残り ${result.product.stock}）`,
    product: result.product,
  });
});

// ---- auth ----
app.post("/api/login", async (c) => {
  const body = await c.req.json<{ id?: string; password?: string }>().catch(() => ({}) as { id?: string; password?: string });
  const user = authenticate(String(body.id ?? ""), String(body.password ?? ""));
  if (!user) return c.json({ error: "invalid_credentials", message: "ID かパスワードが違います" }, 401);
  c.header("Set-Cookie", `${SESSION_COOKIE}=${await signSession(user)}; ${sessionCookieAttributes()}`);
  return c.json({ user });
});

app.post("/api/logout", (c) => {
  c.header("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return c.json({ ok: true });
});

app.get("/api/me", (c) => {
  const user = c.get("user");
  return user ? c.json({ user }) : c.json({ error: "unauthorized" }, 401);
});

app.get("/api/admin/stats", requireUser("view-admin"), (c) => c.json({ stats: reservationStats() }));

app.notFound((c) => c.json({ error: "not_found" }, 404));

// ---- static SPA ----
const here = fileURLToPath(new URL(".", import.meta.url));
const DIST = [join(here, "../../spa-catalog/dist"), join(here, "../spa-catalog/dist")].find((d) => existsSync(d));
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

const honoListener = getRequestListener(app.fetch);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname.startsWith("/api/") || !DIST) return honoListener(req, res);

  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(DIST, rel);
  if (file.startsWith(DIST) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": rel.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    return res.end(readFileSync(file));
  }
  // SPA fallback only for navigations (what a CDN "404 -> index.html" rule would do).
  if ((req.headers.accept ?? "").includes("text/html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
    return res.end(readFileSync(join(DIST, "index.html")));
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

const port = Number(process.env.PORT ?? 3002);
server.listen(port, () => console.log(`api listening on http://localhost:${port} (spa: ${DIST ?? "not built"})`));
