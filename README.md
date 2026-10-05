# next-vs-react-router-catalog

「とりあえず Next.js」で選んだ場合と、Vite + TanStack Router の SPA（+ 薄い API）で済ませた場合で、**同じ仕様のアプリ**が何を抱え込むかを数字で比べるためのリポジトリ。

テックブログ記事『とりあえず Next.js の選択肢に鉄槌を下す』の実験台。記事の骨子は [`docs/article-outline.md`](docs/article-outline.md)、下書きは [`docs/article-draft.md`](docs/article-draft.md)、計測結果は [`docs/results/COMPARISON.md`](docs/results/COMPARISON.md)、機能ごとの対応表は [`docs/feature-matrix.md`](docs/feature-matrix.md)。

> 以前は React Router (framework mode) を比較対象にしていた。その版はコミット `3c087d5` にある。

## 構成

```
apps/next-catalog     Next.js 16 (App Router, Turbopack)。create-next-app の既定構成からスタート
apps/spa-catalog      Vite + TanStack Router の SPA。@tanstack/cli の既定構成からスタート
apps/api              Hono の JSON API。ローカルでは SPA の静的ファイルも配信する
packages/catalog-data 両方が共有する商品データとインメモリ在庫（DB なし）
scripts/              計測 (measure) / 脆弱性履歴 (advisories) / レポート生成 (report)
docs/                 記事骨子・下書き・計測結果・機能対応表
```

## 仕様（両方共通）

| 機能 | Next.js | TanStack Router SPA + Hono API |
| --- | --- | --- |
| `/` 一覧 + 検索（`?q=&category=`） | Server Component + `searchParams` | `loader` + `validateSearch`、データは `/api/products` |
| クイックビュー（一覧から詳細をモーダルで。URL は `/products/:id`、リロードで本物の詳細） | Parallel Route `@modal` + Intercepting Route `(.)products/[id]` | `?quick=<id>` + route masking（`unmaskOnReload`） |
| `/products/:id` 詳細 | 動的ルート + `generateMetadata` + `notFound()` | 動的ルート + `head` + `notFound()` |
| OG 画像 | `next/og` の `ImageResponse`（`/products/:id/opengraph-image`） | なし（SPA では作れない。CDN 側や別サービスの仕事） |
| 予約（POST で在庫を減らす） | Server Action + `useActionState` | `fetch` → `POST /api/products/:id/reserve` |
| JSON API | Route Handler | Hono |
| 404 / エラー境界 | `not-found.tsx` / `error.tsx` | `notFoundComponent` / `defaultErrorComponent` |
| 画像 | `next/image`（既定の最適化を有効のまま） | 素の `<img>` |

## 使い方

```sh
pnpm install
pnpm build          # 3 パッケージをビルド
pnpm --filter next-catalog start   # http://localhost:3001
pnpm --filter api start            # http://localhost:3002 （SPA + API）

pnpm advisories     # osv.dev から脆弱性履歴を取得 -> docs/results/advisories.json
pnpm measure        # ビルド時間・依存・バンドル・起動・レイテンシ・露出エンドポイント -> docs/results/measure.json
pnpm report         # docs/results/COMPARISON.md を生成
```

Vercel にデプロイする場合、`apps/spa-catalog` をルートにすると `vercel.json` の rewrite で `/api/*` が同梱の関数（`api/index.js`）に、それ以外が `index.html` に回る。`api/index.js` は `apps/api/src/vercel.ts` を Hono ごと esbuild でバンドルした生成物だが、Vercel はビルド前のソースツリーから関数を検出するためリポジトリにコミットしてある（`pnpm --filter spa-catalog build:api` で再生成、CI が差分を検査）。在庫はプロセス内メモリなのでサーバレスでは呼び出しごとにリセットされうる（デモなので許容）。`apps/next-catalog` はそのまま Vercel に載る。

開発時は `pnpm --filter api dev`（3002）と `pnpm --filter spa-catalog dev`（5173、`/api` を 3002 にプロキシ）、`pnpm --filter next-catalog dev`（3000）。

## フェアネスのために固定していること

- どちらも各 CLI の既定テンプレートから始め、設定はほぼ触っていない（Next は `transpilePackages` と `output: "standalone"` のみ追加）
- Tailwind v4、React 19、TypeScript strict は共通
- 画面の見た目・DOM 構造・`data-testid` は同一
- 在庫状態は `globalThis` に置いている。Next はサーバコードをルート単位で分割するためモジュールスコープのシングルトンが複製される（`.next/server` 内で `@catalog/data` が複数チャンクに現れる）
