/**
 * Pulls the published advisory history for each framework's packages from
 * osv.dev and writes docs/results/advisories.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

const GROUPS = {
  next: { label: "Next.js", packages: ["next"] },
  tanstack: {
    label: "TanStack Router (SPA 側)",
    packages: ["@tanstack/react-router", "@tanstack/router-core", "@tanstack/history", "@tanstack/router-plugin"],
  },
  hono: { label: "Hono (API 側)", packages: ["hono", "@hono/node-server"] },
  rsc: {
    label: "React Server Components runtime (Next が同梱、SPA は未使用)",
    packages: ["react-server-dom-webpack", "react-server-dom-turbopack", "react-server-dom-parcel"],
  },
  reactRouter: {
    label: "React Router framework mode（参考値: 別の SSR 側の選択肢）",
    packages: ["react-router", "@react-router/dev", "@react-router/node", "@react-router/serve"],
  },
};

async function query(name) {
  const vulns = [];
  let pageToken;
  do {
    const res = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ package: { name, ecosystem: "npm" }, page_token: pageToken }),
    });
    if (!res.ok) throw new Error(`osv ${name}: ${res.status}`);
    const json = await res.json();
    vulns.push(...(json.vulns ?? []));
    pageToken = json.next_page_token;
  } while (pageToken);
  return vulns;
}

function severityOf(v) {
  const label = v.database_specific?.severity;
  const cvss = v.severity?.find((s) => s.type?.startsWith("CVSS"))?.score;
  return { label: label ?? "UNKNOWN", cvss: cvss ?? null };
}

function fixedVersions(v, name) {
  const out = new Set();
  for (const a of v.affected ?? []) {
    if (a.package?.name !== name) continue;
    for (const r of a.ranges ?? []) for (const e of r.events ?? []) if (e.fixed) out.add(e.fixed);
  }
  return [...out];
}

const out = { fetchedAt: new Date().toISOString(), source: "https://api.osv.dev/v1/query", groups: {} };
for (const [key, g] of Object.entries(GROUPS)) {
  const byId = new Map();
  for (const name of g.packages) {
    for (const v of await query(name)) {
      const sev = severityOf(v);
      const entry = byId.get(v.id) ?? {
        id: v.id,
        aliases: v.aliases ?? [],
        summary: v.summary ?? "",
        published: v.published,
        year: (v.published ?? "").slice(0, 4),
        severity: sev.label,
        cvss: sev.cvss,
        packages: [],
        fixed: {},
        rce: /remote code execution|\bRCE\b|arbitrary code/i.test(`${v.summary} ${v.details ?? ""}`),
        supplyChain: /malware|malicious code|compromised/i.test(`${v.summary}`),
      };
      entry.packages.push(name);
      entry.fixed[name] = fixedVersions(v, name);
      byId.set(v.id, entry);
    }
  }
  const list = [...byId.values()].sort((a, b) => (a.published < b.published ? 1 : -1));
  const countBy = (fn) => list.reduce((acc, v) => ((acc[fn(v)] = (acc[fn(v)] ?? 0) + 1), acc), {});
  out.groups[key] = {
    label: g.label,
    packages: g.packages,
    total: list.length,
    bySeverity: countBy((v) => v.severity),
    byYear: countBy((v) => v.year),
    criticalOrHighByYear: list.filter((v) => ["CRITICAL", "HIGH"].includes(v.severity)).reduce((acc, v) => ((acc[v.year] = (acc[v.year] ?? 0) + 1), acc), {}),
    rceCount: list.filter((v) => v.rce).length,
    supplyChainCount: list.filter((v) => v.supplyChain).length,
    advisories: list,
  };
  console.log(`${g.label}: ${list.length} advisories`);
}
mkdirSync(join(ROOT, "docs/results"), { recursive: true });
writeFileSync(join(ROOT, "docs/results/advisories.json"), JSON.stringify(out, null, 2));
console.log("wrote docs/results/advisories.json");
