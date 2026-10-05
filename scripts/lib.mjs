import { spawn, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

export const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

export const APPS = {
  next: {
    label: "Next.js",
    dir: join(ROOT, "apps/next-catalog"),
    pkgs: ["next-catalog"],
    startPkg: "next-catalog",
    port: 3001,
    cleanDirs: [".next"],
    outputDirs: [".next"],
    outputExclude: [".next/cache", ".next/standalone"],
    deployable: [".next/standalone", ".next/static"],
    deployableNote: ".next/standalone (traced node_modules included) + .next/static",
    sourceGlobs: ["src", "next.config.ts", "postcss.config.mjs", "eslint.config.mjs", "tsconfig.json"],
    frameworkPackages: ["next"],
  },
  spa: {
    label: "TanStack Router SPA",
    dir: join(ROOT, "apps/spa-catalog"),
    pkgs: ["spa-catalog"],
    startPkg: "spa-catalog",
    port: 3002,
    cleanDirs: ["dist"],
    outputDirs: ["dist"],
    outputExclude: [],
    deployable: ["dist"],
    deployableNote: "spa-catalog/dist (static files only)",
    sourceGlobs: ["src", "index.html", "vite.config.ts", "tsconfig.json", "eslint.config.js", "serve.mjs"],
    frameworkPackages: ["@tanstack/react-router", "@tanstack/router-plugin"],
  },

};

export function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024, ...opts });
}

export function walk(dir, { exclude = [] } = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  const st = statSync(dir);
  if (!st.isDirectory()) return [dir];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (exclude.some((e) => p === e || p.startsWith(e + "/"))) continue;
    const s = statSync(p, { throwIfNoEntry: false });
    if (!s) continue;
    if (s.isDirectory()) out.push(...walk(p, { exclude }));
    else out.push(p);
  }
  return out;
}

export function dirSize(dir, { exclude = [] } = {}) {
  let bytes = 0;
  let files = 0;
  for (const f of walk(dir, { exclude })) {
    const s = statSync(f, { throwIfNoEntry: false });
    if (!s) continue;
    bytes += s.size;
    files += 1;
  }
  return { bytes, files };
}

export function countLines(paths) {
  let lines = 0;
  let files = 0;
  for (const p of paths) {
    for (const f of walk(p)) {
      if (!/\.(tsx?|mjs|cjs|js|css|json)$/.test(f)) continue;
      if (/\/(\.react-router|\.next|node_modules)\//.test(f)) continue;
      const text = readFileSync(f, "utf8");
      lines += text.split("\n").filter((l) => l.trim() !== "").length;
      files += 1;
    }
  }
  return { lines, files };
}

export function compressedSizes(buf) {
  return {
    raw: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf).length,
  };
}

/** Unique production (or all) packages resolved for a workspace app, via pnpm. */
export function listDeps(appDir, { prod = true } = {}) {
  const json = sh(`pnpm ls ${prod ? "--prod" : ""} --depth Infinity --json`, { cwd: appDir });
  const tree = JSON.parse(json)[0];
  const seen = new Map();
  const visit = (deps) => {
    for (const [name, node] of Object.entries(deps ?? {})) {
      const key = `${name}@${node.version}`;
      if (!seen.has(key)) {
        let path = node.path;
        try {
          path = realpathSync(path);
        } catch {}
        seen.set(key, { name, version: node.version, path });
        visit(node.dependencies);
        visit(node.optionalDependencies);
      }
    }
  };
  visit(tree.dependencies);
  visit(tree.optionalDependencies);
  if (!prod) visit(tree.devDependencies);
  const pkgs = [...seen.values()].filter((p) => !p.path?.includes("/packages/catalog-data"));
  let bytes = 0;
  const seenPaths = new Set();
  for (const p of pkgs) {
    if (!p.path || seenPaths.has(p.path)) continue;
    seenPaths.add(p.path);
    bytes += dirSize(p.path, { exclude: [join(p.path, "node_modules")] }).bytes;
  }
  return { count: pkgs.length, bytes, packages: pkgs.map((p) => `${p.name}@${p.version}`).sort() };
}

export async function waitFor(url, { timeoutMs = 60_000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return Date.now() - start;
    } catch {}
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`timeout waiting for ${url}`);
}

export function startServer(app) {
  const child = spawn("pnpm", ["--filter", app.startPkg, "start"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
    detached: true,
  });
  let logs = "";
  child.stdout.on("data", (d) => (logs += d));
  child.stderr.on("data", (d) => (logs += d));
  const stop = () => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  };
  return { child, stop, logs: () => logs };
}

export function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i];
}

export function fmtBytes(n) {
  if (n == null) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
