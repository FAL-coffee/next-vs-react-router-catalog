# Next.js の機能を SPA（TanStack Router）で再現するとどうなるか

「とりあえず Next.js」が同梱している機能を一つずつ、このリポジトリで実際に SPA 側に移植した結果。**再現コスト**はこのリポジトリで実装したときの体感、**本当に足りない？**は「SPA で済ませられないか」の判定。

| Next.js の機能 | このリポジトリでの Next 側実装 | SPA 側の再現 | 再現コスト | 本当に足りない？ |
| --- | --- | --- | --- | --- |
| SSR / 初期 HTML | 全ルート dynamic | なし。空の `index.html` + JS | 0 | **未ログインの公開ページがあるなら足りない**。認証後の業務画面なら不要。Chrome 実測: 通常回線は SPA が速く（388 vs 536 ms）、1.6 Mbps + CPU 4x では Next が速い（1,084 vs 1,748 ms） |
| RSC（クライアント JS 削減） | Server Component で一覧・詳細を描画 | ルート単位のコード分割（`autoCodeSplitting`） | 0 | 今回の規模では JS 転送量は Next の方が多い。不要 |
| Server Actions（フォーム） | 予約 | `useState` + データ層呼び出し（実運用なら `fetch`） | 低 | **JS 無効で動かすのは無理**。それ以外は不要 |
| Route Handlers（API） | `/api/products`, `/api/products/:id` | なし。実運用では既存の BFF / API を叩く | 低。BFF が既にある会社は最初からこれ | 不要 |
| Middleware（proxy） | 使っていない | `beforeLoad` が同じ位置づけ。本体の認可は API の仕事 | 低 | 不要。認可を Middleware だけに置くと 2025〜2026 のバイパス 6 件がそのまま刺さる |
| Parallel Routes + Intercepting Routes | `@modal/(.)products/[id]` のクイックビュー。モーダルから本物のページへは `<a href>` のフルリロードが要る | `?quick=<id>` + route masking。本物のページへは普通の `<Link>` | 低。むしろ SPA の方が短い | 不要 |
| Image Optimization | `next/image`（既定で有効） | `<img>`。最適化は CDN の仕事 | 中（CDN 側の設定が要る） | **外部画像を大量に扱うなら足りない**。それ以外は不要。ただし Chrome 実測では画像 18.8 kB vs 84 kB の差が制限環境の初回表示に効いた |
| Metadata API / OG 画像 | `generateMetadata` + `next/og` | `head` で title のみ。OG 画像は作れない | 高（別サービスが要る） | **SNS に貼られる公開ページがあるなら足りない** |
| ISR / キャッシュ階層 | 使っていない（全ルート dynamic） | HTTP キャッシュ + CDN | 低 | 不要 |
| Link prefetch | `next/link` の既定 | `defaultPreload: "intent"` | 0 | 不要 |
| 型付きルート | `PageProps<"/products/[id]">`（Next 16） | TanStack Router の `createFileRoute` | 0 | 不要。SPA 側の方が search params まで型が付く |
| 動的ルートの直接アクセス / 404 | `/products/[id]` は実行時にマッチ、`notFound()` → 404 | ビルド時に既知の ID ごとに `index.html` を生成（`generateStaticParams` 相当）。未知の ID はホストが本物の 404 | 低（Vite プラグイン 30 行） | **ビルド時に列挙できないルート**（投稿やレビューのようにユーザーが増やしていくコンテンツ。いわゆる UGC）があるなら足りない |

## 残ったもの

SPA で「足りない」と判定されたのは次の 4 つだけ。

1. 未ログインで見られる公開ページの初期 HTML（SEO、初期表示）
2. SNS シェア用の OG 画像
3. JavaScript 無効でも動くフォーム
4. ビルド時に列挙できない動的ルート（投稿やレビューのようにユーザーが増やしていくコンテンツ。いわゆる UGC）への直接アクセスと、その正しい 404

これらが**無い**プロダクトは、Next.js の機能を全部「過剰」として抱えている。

## 逆に SPA で増えたもの

- API の責務（入力検証、CSRF、レート制限、認可）が別のサーバに移る。Next でも Route Handler / Server Action を使うなら同じ責務はあるが、Next は「サーバがあること」を忘れさせる
- 画面側で「データをいつ取り直すか」を自分で決める（このリポジトリでは予約後に `router.invalidate()`）
- サプライチェーン: 2026/5 に `@tanstack/*` の npm パッケージに悪性コードが混入した。**薄いから安全、ではない**
- 在庫のような状態はブラウザのタブに閉じる。共有したければ結局サーバが要る（このリポジトリではモックなので許容）
