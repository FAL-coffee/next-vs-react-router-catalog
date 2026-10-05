/**
 * Renders docs/results/COMPARISON.md from measure.json + advisories.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fmtBytes } from "./lib.mjs";

const m = JSON.parse(readFileSync(join(ROOT, "docs/results/measure.json"), "utf8"));
const adv = JSON.parse(readFileSync(join(ROOT, "docs/results/advisories.json"), "utf8"));
const N = m.apps.next;
const R = m.apps.spa;

const lines = [];
const h = (s) => lines.push("", s, "");
const table = (header, rows) => {
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);
  for (const r of rows) lines.push(`| ${r.join(" | ")} |`);
  lines.push("");
};
const ms = (n) => (n == null ? "-" : `${n} ms`);
const ratio = (a, b) => (a && b ? `${(a / b).toFixed(1)}x` : "-");

lines.push("# Next.js vs TanStack Router SPA: 同一仕様カタログの計測結果");
lines.push("");
lines.push(`計測日時: ${m.measuredAt} / Node ${m.node} / pnpm ${m.pnpm}`);
lines.push("");
lines.push("両アプリは同じ `@catalog/data`（商品データ、インメモリ在庫、デモ認証）を使い、同じ画面・同じ振る舞い（一覧・検索・クイックビュー・詳細・予約・ログイン・マイページ・管理・API・404・エラー境界）を持つ。SPA 側の数値は `apps/spa-catalog`（静的ファイル）と `apps/api`（Hono）の合算。");
lines.push("");
lines.push("> 数値はこの環境（クラウドコンテナ）での1回の計測。絶対値よりも両者の比を見ること。`pnpm measure && pnpm report` で再現できる。");

h("## 1. バージョン");
table(["", "Next.js", "TanStack Router SPA + API"], [
  ["フレームワーク", Object.entries(N.frameworkVersions).map(([k, v]) => `${k}@${v}`).join("<br>"), Object.entries(R.frameworkVersions).map(([k, v]) => `${k}@${v}`).join("<br>")],
  ["package.json の dependencies", N.declaredDeps.dependencies.join(", "), R.declaredDeps.dependencies.join(", ")],
  ["package.json の devDependencies", N.declaredDeps.devDependencies.join(", "), R.declaredDeps.devDependencies.join(", ")],
]);

h("## 2. 書いたコード量（アプリ側ソース）");
table(["", "Next.js", "TanStack Router SPA + API"], [
  ["ファイル数", N.source.files, R.source.files],
  ["非空行数", N.source.lines, R.source.lines],
]);

h("## 3. 依存パッケージ（node_modules に実際に解決されたユニークな package@version）");
table(["", "Next.js", "TanStack Router SPA + API", "比"], [
  ["本番依存 パッケージ数", N.deps.prod.count, R.deps.prod.count, ratio(N.deps.prod.count, R.deps.prod.count)],
  ["本番依存 ディスクサイズ", fmtBytes(N.deps.prod.bytes), fmtBytes(R.deps.prod.bytes), ratio(N.deps.prod.bytes, R.deps.prod.bytes)],
  ["開発依存込み パッケージ数", N.deps.all.count, R.deps.all.count, ratio(N.deps.all.count, R.deps.all.count)],
  ["開発依存込み ディスクサイズ", fmtBytes(N.deps.all.bytes), fmtBytes(R.deps.all.bytes), ratio(N.deps.all.bytes, R.deps.all.bytes)],
  ["RSC ランタイム (react-server-dom-*) を同梱", N.deps.hasRscRuntime ? "はい" : "いいえ", R.deps.hasRscRuntime ? "はい" : "いいえ", ""],
  ["画像処理ネイティブライブラリ (sharp / libvips) を同梱", N.deps.hasImageLib ? "はい" : "いいえ", R.deps.hasImageLib ? "はい" : "いいえ", ""],
]);

h("## 4. ビルド");
table(["", "Next.js", "TanStack Router SPA + API", "比"], [
  [`本番ビルド時間（${N.build?.runsMs.length ?? 0}回中の最速、クリーンビルド）`, ms(N.build?.bestMs), ms(R.build?.bestMs), ratio(N.build?.bestMs, R.build?.bestMs)],
  ["ビルド時間 各回", N.build?.runsMs.map(ms).join(", "), R.build?.runsMs.map(ms).join(", "), ""],
  ["ビルド出力サイズ（キャッシュ除く）", `${fmtBytes(N.output.bytes)} / ${N.output.files} files`, `${fmtBytes(R.output.bytes)} / ${R.output.files} files`, ratio(N.output.bytes, R.output.bytes)],
  ["デプロイに必要な一式", `${fmtBytes(N.deployable.bytes)}<br>(${N.deployable.note})`, `${fmtBytes(R.deployable.bytes)}<br>(${R.deployable.note})`, ratio(N.deployable.bytes, R.deployable.bytes)],
]);

h("## 5. ランタイム");
table(["", "Next.js", "TanStack Router SPA + API", "比"], [
  ["コールドスタート（`start` 実行から `/` が 200 を返すまで）", ms(N.coldStartMs), ms(R.coldStartMs), ratio(N.coldStartMs, R.coldStartMs)],
  ["常駐メモリ RSS（アイドル後、プロセスツリー合計）", fmtBytes((N.memoryRssKb ?? 0) * 1024), fmtBytes((R.memoryRssKb ?? 0) * 1024), ratio(N.memoryRssKb, R.memoryRssKb)],
]);
lines.push("レイテンシ（ウォームアップ後、逐次 200 リクエスト、localhost）:");
lines.push("");
table(["パス", "Next p50", "Next p95", "SPA+API p50", "SPA+API p95"], Object.keys(N.latency).map((p) => [`\`${p}\``, ms(N.latency[p].p50), ms(N.latency[p].p95), ms(R.latency[p].p50), ms(R.latency[p].p95)]));

h("## 6. ページ重量（実ブラウザで networkidle まで読み込んだ転送内容）");
for (const path of Object.keys(N.pages)) {
  const a = N.pages[path];
  const b = R.pages[path];
  lines.push(`### \`${path}\``);
  lines.push("");
  table(["", "Next.js", "TanStack Router SPA + API", "比"], [
    ["HTML", fmtBytes(a.document.raw), fmtBytes(b.document.raw), ratio(a.document.raw, b.document.raw)],
    ["JS ファイル数", a.script.count, b.script.count, ""],
    ["JS 合計 (raw)", fmtBytes(a.script.raw), fmtBytes(b.script.raw), ratio(a.script.raw, b.script.raw)],
    ["JS 合計 (gzip)", fmtBytes(a.script.gzip), fmtBytes(b.script.gzip), ratio(a.script.gzip, b.script.gzip)],
    ["JS 合計 (brotli)", fmtBytes(a.script.brotli), fmtBytes(b.script.brotli), ratio(a.script.brotli, b.script.brotli)],
    ["CSS", fmtBytes(a.stylesheet.raw), fmtBytes(b.stylesheet.raw), ""],
    ["画像 (枚数 / バイト)", `${a.image.count} / ${fmtBytes(a.image.raw)}`, `${b.image.count} / ${fmtBytes(b.image.raw)}`, ""],
    ["リクエスト総数 / 総バイト", `${a.total.count} / ${fmtBytes(a.total.raw)}`, `${b.total.count} / ${fmtBytes(b.total.raw)}`, ""],
  ]);
}

h("## 7. 露出しているエンドポイント（アプリが定義していないパスへの応答）");
lines.push("同じリクエストを両サーバに投げたときのステータス。`404` 以外が返るものは、アプリのコードとは無関係にフレームワークが生やしている口。SPA 側は `Accept: text/html` のリクエストにだけ `index.html` を返す（CDN の 404 → index.html ルールと同じ）。");
lines.push("");
table(["リクエスト", "意味", "Next.js", "TanStack Router SPA + API"], N.probes.map((p, i) => [
  `\`${p.method ?? "GET"} ${p.path}\`${p.headers ? `<br>headers: \`${JSON.stringify(p.headers)}\`` : ""}${p.follow ? "<br>(リダイレクト追従)" : ""}`,
  p.note,
  `${p.status}${p.contentType ? ` (${p.contentType})` : ""}`,
  `${R.probes[i].status}${R.probes[i].contentType ? ` (${R.probes[i].contentType})` : ""}`,
]));
lines.push("`/` のレスポンスヘッダ:");
lines.push("");
table(["ヘッダ", "Next.js", "TanStack Router SPA + API"], [...new Set([...Object.keys(N.responseHeaders), ...Object.keys(R.responseHeaders)])].sort().map((k) => [k, N.responseHeaders[k] ?? "-", R.responseHeaders[k] ?? "-"]));

h("## 8. 公開済み脆弱性の履歴（osv.dev, 取得日 " + adv.fetchedAt.slice(0, 10) + "）");
lines.push("パッケージ単位で osv.dev に登録されている advisory を集計。severity は GitHub Advisory Database のラベル。");
lines.push("");
const years = [...new Set(Object.values(adv.groups).flatMap((g) => Object.keys(g.byYear)))].sort();
table(["グループ", "対象パッケージ", "総数", "CRITICAL", "HIGH", "MODERATE", "LOW", "うち供給網（マルウェア混入）"], Object.values(adv.groups).map((g) => [g.label, g.packages.map((p) => `\`${p}\``).join(" "), g.total, g.bySeverity.CRITICAL ?? 0, g.bySeverity.HIGH ?? 0, g.bySeverity.MODERATE ?? 0, g.bySeverity.LOW ?? 0, g.supplyChainCount ?? 0]));
lines.push("年別（CRITICAL + HIGH のみ）:");
lines.push("");
table(["グループ", ...years], Object.values(adv.groups).map((g) => [g.label, ...years.map((y) => g.criticalOrHighByYear[y] ?? 0)]));
lines.push("年別（全件）:");
lines.push("");
table(["グループ", ...years], Object.values(adv.groups).map((g) => [g.label, ...years.map((y) => g.byYear[y] ?? 0)]));
for (const g of Object.values(adv.groups)) {
  const crit = g.advisories.filter((v) => v.severity === "CRITICAL");
  if (crit.length === 0) continue;
  lines.push(`### ${g.label}: CRITICAL 一覧`);
  lines.push("");
  table(["公開日", "ID", "CVE", "概要", "修正版"], crit.map((v) => [v.published.slice(0, 10), `[${v.id}](https://osv.dev/vulnerability/${v.id})`, v.aliases.filter((a) => a.startsWith("CVE")).join(", ") || "-", v.summary.replace(/\|/g, "\\|"), Object.entries(v.fixed).map(([p, f]) => `${p}: ${f.join(", ") || "-"}`).join("<br>")]));
}
lines.push("直近 12 か月の CRITICAL / HIGH（全グループ）:");
lines.push("");
const since = new Date(adv.fetchedAt);
since.setFullYear(since.getFullYear() - 1);
const recent = Object.values(adv.groups).flatMap((g) => g.advisories.filter((v) => ["CRITICAL", "HIGH"].includes(v.severity) && new Date(v.published) >= since).map((v) => ({ ...v, group: g.label })));
const seen = new Set();
table(["公開日", "グループ", "severity", "ID", "概要"], recent.sort((a, b) => (a.published < b.published ? 1 : -1)).filter((v) => !seen.has(v.id) && seen.add(v.id)).map((v) => [v.published.slice(0, 10), v.group.split(" (")[0], v.severity, `[${v.id}](https://osv.dev/vulnerability/${v.id})`, v.summary.replace(/\|/g, "\\|")]));

writeFileSync(join(ROOT, "docs/results/COMPARISON.md"), lines.join("\n") + "\n");
console.log("wrote docs/results/COMPARISON.md");
