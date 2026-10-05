/**
 * Measures both apps with the same procedure and writes docs/results/measure.json.
 *
 *   pnpm measure            # everything
 *   pnpm measure --skip-build
 */
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";
import {
  APPS,
  ROOT,
  sh,
  dirSize,
  countLines,
  compressedSizes,
  listDeps,
  waitFor,
  startServer,
  percentile,
} from "./lib.mjs";

const skipBuild = process.argv.includes("--skip-build");
const BUILD_RUNS = 2;
const LATENCY_N = 200;

const executablePath = process.env.PW_CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

/** Paths that reveal what each server exposes beyond the app's own routes. */
const PROBES = [
  { path: "/", headers: { accept: "text/html" }, note: "app route" },
  { path: "/robots.txt", note: "not defined by either app" },
  { path: "/_next/image?url=%2Fimages%2Fuji-sencha.png&w=640&q=75", note: "Next.js image optimizer (local src)" },
  { path: "/_next/image?url=https%3A%2F%2Fexample.com%2Fx.png&w=640&q=75", note: "Next.js image optimizer (remote src)" },
  { path: "/_next/image?url=%2Fimages%2Fuji-sencha.png&w=640&q=75", headers: { accept: "image/avif,image/webp" }, note: "image optimizer, AVIF/WebP negotiated" },
  { path: "/products/uji-sencha/opengraph-image", note: "next/og ImageResponse (OG image generated on the server)" },
  // Next 16 answers an RSC request with a 307 to a `_rsc=<hash>` URL first, so follow redirects here.
  { path: "/", headers: { RSC: "1" }, follow: true, note: "RSC flight payload request (redirects followed)" },
  { path: "/", method: "POST", headers: { "Next-Action": "0000000000000000000000000000000000000000", "Content-Type": "text/plain" }, body: "[]", note: "Server Action endpoint (bogus id)" },
  { path: "/api/products/uji-sencha/reserve", method: "POST", headers: { "content-type": "application/json" }, body: "{\"quantity\":1}", note: "mutation endpoint (Next mutates via Server Action instead)" },
  { path: "/__manifest?p=%2F&version=0", note: "React Router lazy route discovery manifest (neither app)" },
  { path: "/.well-known/appspecific/com.chrome.devtools.json", note: "Chrome DevTools workspace probe" },
  { path: "/_next/static/chunks/main.js", note: "Next.js static chunk dir" },
];

async function measureApp(key) {
  const app = APPS[key];
  const r = { key, label: app.label };

  // ---- versions ----
  const dirs = [app.dir, ...(app.apiDir ? [app.apiDir] : [])];
  r.frameworkVersions = Object.fromEntries(
    app.frameworkPackages.map((name) => {
      for (const d of dirs) {
        // read the file directly: some packages (hono) do not export ./package.json
        const pj = join(d, "node_modules", name, "package.json");
        if (existsSync(pj)) return [name, JSON.parse(readFileSync(pj, "utf8")).version];
      }
      return [name, "?"];
    }),
  );
  r.declaredDeps = { dependencies: [], devDependencies: [] };
  for (const d of dirs) {
    const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"));
    r.declaredDeps.dependencies.push(...Object.keys(pkg.dependencies ?? {}).filter((x) => x !== "@catalog/data"));
    r.declaredDeps.devDependencies.push(...Object.keys(pkg.devDependencies ?? {}));
  }

  // ---- source ----
  r.source = countLines(app.sourceGlobs.map((g) => join(app.dir, g)));

  // ---- deps ----
  const merge = (lists) => {
    const packages = [...new Set(lists.flatMap((l) => l.packages))].sort();
    return { count: packages.length, bytes: lists.reduce((a, l) => a + l.bytes, 0), packages };
  };
  r.deps = {
    prod: merge(dirs.map((d) => listDeps(d, { prod: true }))),
    all: merge(dirs.map((d) => listDeps(d, { prod: false }))),
  };
  // Next.js vendors React + the RSC runtime under next/dist/compiled, so it never
  // shows up as a separate package. Check both places.
  r.deps.hasRscRuntime =
    r.deps.prod.packages.some((p) => p.startsWith("react-server-dom-")) ||
    existsSync(join(app.dir, "node_modules/next/dist/compiled/react-server-dom-turbopack"));
  r.deps.hasImageLib = r.deps.prod.packages.some((p) => p.startsWith("sharp@") || p.startsWith("@img/"));

  // ---- build ----
  if (!skipBuild) {
    r.build = { runsMs: [] };
    for (let i = 0; i < BUILD_RUNS; i++) {
      for (const d of app.cleanDirs) rmSync(join(app.dir, d), { recursive: true, force: true });
      const t0 = performance.now();
      for (const pkg of app.pkgs) sh(`pnpm --filter ${pkg} build`, { cwd: ROOT, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
      r.build.runsMs.push(Math.round(performance.now() - t0));
    }
    r.build.bestMs = Math.min(...r.build.runsMs);
  }
  r.output = app.outputDirs.reduce(
    (acc, d) => {
      const x = dirSize(join(app.dir, d), { exclude: app.outputExclude.map((e) => join(app.dir, e)) });
      return { bytes: acc.bytes + x.bytes, files: acc.files + x.files };
    },
    { bytes: 0, files: 0 },
  );
  r.deployable = app.deployable.reduce(
    (acc, d) => {
      const s = dirSize(join(app.dir, d));
      return { bytes: acc.bytes + s.bytes, files: acc.files + s.files };
    },
    { bytes: 0, files: 0 },
  );
  if (key === "spa") {
    // The API ships dist/ + its production node_modules; add the latter so the
    // number is comparable with Next's self-contained standalone directory.
    r.deployable = { bytes: r.deployable.bytes + listDeps(app.apiDir, { prod: true }).bytes, files: r.deployable.files };
  }
  r.deployable.note = app.deployableNote;

  // ---- runtime ----
  const base = `http://localhost:${app.port}`;
  const server = startServer(app);
  try {
    r.coldStartMs = await waitFor(base + "/");

    // response headers on /
    const head = await fetch(base + "/");
    r.responseHeaders = Object.fromEntries([...head.headers.entries()].filter(([k]) => !/^(date|etag|content-length|connection|keep-alive)$/i.test(k)));

    // endpoint probes
    r.probes = [];
    for (const probe of PROBES) {
      const res = await fetch(base + probe.path, { method: probe.method ?? "GET", headers: probe.headers, body: probe.body, redirect: probe.follow ? "follow" : "manual" });
      const ct = res.headers.get("content-type") ?? "";
      await res.arrayBuffer();
      r.probes.push({ ...probe, status: res.status, contentType: ct.split(";")[0], finalUrl: res.url.replace(base, "") });
    }

    // page weight via a real browser
    const browser = await chromium.launch({ executablePath });
    r.pages = {};
    for (const path of ["/", "/products/ethiopia-yirgacheffe", "/about"]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const resources = [];
      page.on("response", async (res) => {
        try {
          const req = res.request();
          const type = req.resourceType();
          const body = await res.body().catch(() => Buffer.alloc(0));
          resources.push({ url: res.url(), type, status: res.status(), ...compressedSizes(body) });
        } catch {}
      });
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const sum = (pred) => resources.filter(pred).reduce((a, x) => ({ raw: a.raw + x.raw, gzip: a.gzip + x.gzip, brotli: a.brotli + x.brotli, count: a.count + 1 }), { raw: 0, gzip: 0, brotli: 0, count: 0 });
      r.pages[path] = {
        document: sum((x) => x.type === "document"),
        script: sum((x) => x.type === "script"),
        stylesheet: sum((x) => x.type === "stylesheet"),
        image: sum((x) => x.type === "image"),
        total: sum(() => true),
        scripts: resources.filter((x) => x.type === "script").map((x) => ({ url: x.url.replace(base, ""), raw: x.raw, gzip: x.gzip })),
        images: resources.filter((x) => x.type === "image").map((x) => ({ url: x.url.replace(base, ""), raw: x.raw })),
      };
      await context.close();
    }
    await browser.close();

    // latency (sequential, warm)
    r.latency = {};
    for (const path of ["/", "/products/ethiopia-yirgacheffe", "/api/products"]) {
      for (let i = 0; i < 20; i++) await (await fetch(base + path)).arrayBuffer();
      const samples = [];
      for (let i = 0; i < LATENCY_N; i++) {
        const t0 = performance.now();
        await (await fetch(base + path)).arrayBuffer();
        samples.push(performance.now() - t0);
      }
      r.latency[path] = {
        n: LATENCY_N,
        p50: +percentile(samples, 50).toFixed(2),
        p95: +percentile(samples, 95).toFixed(2),
        p99: +percentile(samples, 99).toFixed(2),
      };
    }

    // process memory (RSS of the node process tree)
    try {
      const rss = sh(`ps -o rss= --ppid ${server.child.pid} -o pid= | awk '{s+=$1} END {print s}'`).trim();
      const own = sh(`ps -o rss= -p ${server.child.pid}`).trim();
      const all = sh(`pgrep -P ${server.child.pid} | xargs -r -I{} sh -c 'ps -o rss= -p {}; pgrep -P {} | xargs -r ps -o rss= -p' | awk '{s+=$1} END {print s}'`).trim();
      r.memoryRssKb = Number(all || rss || own);
    } catch {}
  } finally {
    server.stop();
    await new Promise((res) => setTimeout(res, 500));
  }
  return r;
}

const results = { measuredAt: new Date().toISOString(), node: process.version, pnpm: sh("pnpm -v").trim(), apps: {} };
for (const key of Object.keys(APPS)) {
  console.log(`\n=== ${APPS[key].label} ===`);
  results.apps[key] = await measureApp(key);
  console.log(JSON.stringify({ build: results.apps[key].build, deps: results.apps[key].deps.prod.count, coldStartMs: results.apps[key].coldStartMs }, null, 0));
}
mkdirSync(join(ROOT, "docs/results"), { recursive: true });
writeFileSync(join(ROOT, "docs/results/measure.json"), JSON.stringify(results, null, 2));
console.log("\nwrote docs/results/measure.json");
