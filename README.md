# next-vs-react-router-catalog

「とりあえず Next.js」を選んだ場合と React Router (framework mode) を選んだ場合で、**同じ仕様のアプリ**が何を抱え込むかを数字で比べるためのリポジトリ。

テックブログ記事『とりあえず Next.js の選択肢に鉄槌を下す』の実験台。記事の骨子は [`docs/article-outline.md`](docs/article-outline.md)、計測結果は [`docs/results/COMPARISON.md`](docs/results/COMPARISON.md)。

## 構成

```
apps/next-catalog     Next.js 16 (App Router, Turbopack)   create-next-app の既定構成からスタート
apps/rr-catalog       React Router 8 (framework mode, Vite) create-react-router の既定構成からスタート
packages/catalog-data 両アプリが共有する商品データ (JSON + インメモリ在庫)。DB は使わない
e2e/                  同じ Playwright スペックを両アプリに当てる + 両サーバの応答を直接突き合わせる parity テスト
scripts/              計測 (measure) / 脆弱性履歴 (advisories) / レポート生成 (report)
docs/                 記事骨子と計測結果
```

## 仕様（両アプリ共通）

| 機能 | Next.js | React Router |
| --- | --- | --- |
| `/` 一覧 + 検索 (`?q=&category=`) | Server Component + `searchParams` | `loader` + `request.url` |
| `/products/:id` 詳細 | 動的ルート + `generateMetadata` + `notFound()` | 動的ルート + `meta` + `throw data(404)` |
| 予約フォーム (POST, 在庫を減らす) | Server Action + `useActionState` | `action` + `<Form method="post">` |
| `/api/products`, `/api/products/:id` | Route Handler | resource route |
| 404 / エラー境界 | `not-found.tsx` / `error.tsx` | root `ErrorBoundary` + catch-all route |
| 画像 | `next/image`（既定の最適化を有効のまま） | 素の `<img>` |

どちらも JavaScript 無効でも検索と予約が動く（E2E で検証）。

## 使い方

```sh
pnpm install
pnpm build          # 両アプリをビルド
pnpm e2e            # 両アプリを起動して同一スペックを実行 (41 tests)
pnpm advisories     # osv.dev から脆弱性履歴を取得 -> docs/results/advisories.json
pnpm measure        # ビルド時間・依存・バンドル・起動・レイテンシ・露出エンドポイント -> docs/results/measure.json
pnpm report         # docs/results/COMPARISON.md を生成
```

開発サーバは `pnpm --filter next-catalog dev` (3000) / `pnpm --filter rr-catalog dev` (3002)。

## フェアネスのために固定していること

- どちらも各 CLI の既定テンプレートから始め、設定はほぼ触っていない（Next は `transpilePackages` と `output: "standalone"` のみ追加）
- Tailwind v4、React 19、TypeScript strict は共通
- 画面の見た目・DOM 構造・`data-testid` は同一。`parity` テストが `/` と詳細ページの本文テキストと API の JSON が完全一致することを確認する
- 在庫状態は `globalThis` に置いている。Next はサーバコードをルート単位で分割するためモジュールスコープのシングルトンが複製される（`.next/server` 内で `@catalog/data` が 4 チャンクに現れる）。これも比較ポイントのひとつ
