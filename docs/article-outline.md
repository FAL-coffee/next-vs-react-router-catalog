# 記事骨子: AI時代の「とりあえずNext.js」に歯向かい続ける挑戦

- 媒体: クロスマート テックブログ (hatenablog)
- 著者: 福留
- 前作: [Remix v3 にコントリビュート（2025/12）](https://xmart-techblog.hatenablog.com/entry/2025/12/01/122639)、[Next.js 13 app ディレクトリ敵情調査（2023, Qiita）](https://qiita.com/FAL-coffee/items/e4bcc16b065a737c9537)
- 根拠リポジトリ: このリポジトリ（計測 `docs/results/COMPARISON.md`、機能対応表 `docs/feature-matrix.md`）

## 主張（1行）

「とりあえず Next.js」は、SSR が要るかどうかの判断を飛ばして、Next.js が同梱する機能を全部抱え込む選び方。Next の機能を一つずつ SPA で再現してみると、本当に SPA で足りないのは 4 つしか残らない。

## 読者

- B2B 業務画面を React で作っていて、フレームワーク選定に関わるエンジニア
- 「Next でいいでしょ」と言われて反論の材料が欲しい人
- Next を選んでいて、何をメンテ対象として抱えているか自覚したい人

## トーン

- 煽りはタイトルまで。本文は時系列・実装・計測で淡々と
- Next が合うケース（残った 4 つ）は明示する
- SPA 側の傷も隠さない: TanStack の 2026/5 サプライチェーン事件、状態をどこに置くかの問題

---

## 1. 導入: 毎月届く「またか」

- 2026/9 の 1 か月で Next.js の Critical が 3 件（AVIF RCE、Windows RCE、`next/og` RCE）
- 全部「うちでは使っていない機能」に刺さった、という感覚
- 「使っていない機能のためにアップデートする」作業はいつから当たり前になったのか
- 立ち位置: 2023 年に app ディレクトリを酔って調査した人間。会社では Remix v2 → React Router。今回はさらに「SPA で足りるのでは」と疑ってみた

## 2. 事実: この 1 年の Next.js Critical（時系列表）

- 5 件、うち未認証 RCE 4 件。刺さった機能列を必ず付ける（middleware / RSC / Image Optimization / Pages+App 併用 / next/og）
- 2026 年の HIGH 16 件の内訳（Middleware バイパス 5、Server Actions SSRF/DoS、RSC DoS）
- Vercel ホストなら守られた期間がある、は書く。セルフホストに刺さるのはどれかを分ける

## 3. 問い直し: その機能、うちは使ってる？

- 「とりあえず Next」が飛ばしている判断 = **ステップ 0: そもそも SSR が要るか**
- Next を選んだ時点で SSR + RSC + Server Actions が既定になる。プロダクト要件を見る前にレンダリング方式が決まる
- だから Next の機能を一つずつ「SPA + API で再現したらどうなるか」試した、という実験の動機

## 4. 実験: 同じカタログを Next.js と TanStack Router SPA で作る

### 4.1 題材と仕様

- 商品カタログ。一覧・検索・クイックビュー（モーダル）・詳細・予約・JSON API・404・エラー境界
- DB なし。インメモリ在庫
- Next は create-next-app 既定、SPA は @tanstack/cli 既定。設定はほぼ触らない
- データ層は共有のモック関数（固定 150 ms）。Next はサーバで、SPA はブラウザで同じ関数を呼ぶ。「データ取得のコストが同じ」状態で比べる
- 画面・DOM・data-testid は同一

### 4.2 Next 側に「テクい機能」をわざと盛った

- Parallel Route + Intercepting Route でクイックビュー（2023 年に「はあ？」と言ったやつ）
- Server Action で予約
- `next/og` で OG 画像
- `next/image` は既定のまま

### 4.3 機能ごとに SPA で再現した結果（記事の本体。`docs/feature-matrix.md` の表）

- 再現コスト 0〜低: SSR 不要なら消える / RSC → コード分割 / Server Actions → データ層呼び出し / Route Handler → 既存 BFF / Parallel+Intercepting → search param + route masking / middleware → beforeLoad（本体の認可は API）/ prefetch / 型付きルート
- 再現コスト中〜高: Image Optimization（CDN の仕事）/ OG 画像（別サービス）
- 不可: JS 無効フォーム / ビルド時に列挙できない動的ルートの直接アクセス（列挙できるものは静的生成で解決。generateStaticParams 相当の Vite プラグイン）
- コード比較は 2 箇所だけ載せる: (a) クイックビュー（intercepting route vs route masking）、(b) 予約フォーム（Server Action vs ブラウザからの呼び出し）

### 4.4 抱え込むもの（計測）

- 本番依存のサイズ、sharp/libvips と RSC ランタイムの同梱、デプロイ一式、ビルド時間（`COMPARISON.md` §3-4）
- SPA 側は本番依存が React + TanStack Router だけ。数ではなく中身で語る

### 4.5 露出している口（計測 §7）

- `/_next/image`（next/image を使わなくても開く、`images.unoptimized: true` で閉じる。検証済み）
- `/products/:id/opengraph-image`（next/og。9 月に RCE が刺さった口）
- `POST /` + `Next-Action`
- `RSC: 1`
- SPA 側で開いている口: ゼロ。静的ファイル以外は 404

### 4.6 初期表示（Chrome 実測、`docs/results/chrome-lcp.md`）

- Vercel 上の両サイトを Chrome で LCP 計測。通常回線は SPA が速い（388 vs 536 ms）、下り 1.6 Mbps + CPU 4x では Next が速い（1,084 vs 1,748 ms）
- 転送量: JS は SPA が 50 kB 軽い、画像は Next が webp 化で 65 kB 軽い。合計はほぼ同じ
- クイックビューは SPA 196 ms、Next 395 ms。Next は同じ商品でも毎回 RSC 通信
- 「SSR の価値 = 細い回線で JS を待たずに中身を出せること」に絞って書く。画像最適化・キャッシュ・データ取得方式が混ざっているので FW 全般の優劣とは言わない

### 4.6b 検索操作（`docs/results/search.md`）

- 既定の Next は検索のたびにフルリロード（通常 291 ms、制限環境 496 ms）。`next/form` にすれば 219 / 298 ms。SPA は 204 / 234 ms で通信ゼロ
- 「とりあえず既定」と「知っていれば直せる」の差として書く。実運用の SPA は BFF 往復が乗るので差は縮む、も添える

### 4.7 地味に刺さった差

- Next のサーバコード分割でモジュールスコープのシングルトンが複製される → `globalThis`
- Intercepting Route のモーダルから本物の詳細ページへは `<Link>` で行けない（ソフトナビゲーションにしか効かない）。素の `<a>` でフルリロードが要る。SPA 側は route masking の実体が別ルートなので `<Link>` で出られる
- React 19 は Server Action 完了後にフォームをリセットする（予約エラー後に数量が初期値に戻る）
- TanStack は search を JSON として読む（`?fail=1` が数値になる）
- TanStack の `errorComponent` はルートに伝播しない（`defaultErrorComponent` を使う）
- 静的 SPA は「存在しないファイル = 404」なので、動的ルートはビルド時に列挙して生成する。rewrite で逃げるとホスティングの話になって比較が壊れる（Vercel で最初に踏んだ）

## 5. SPA 側の傷も並べる

- TanStack: 2026/5 に `@tanstack/*` へ悪性コードが混入（供給網）。「薄いから安全」ではない
- 状態の置き場所: 在庫のような共有状態は SPA ではブラウザに閉じる。共有したければ結局 BFF が要る。「SPA で済む」は「BFF が既にある」とセット

## 6. 残ったもの: Next.js が本当に必要なとき

1. 未ログインで見られる公開ページの初期 HTML（SEO、初期表示）
2. SNS シェア用の OG 画像
3. JS 無効でも動くフォーム
4. ビルド時に列挙できない動的ルート（投稿やレビューのようにユーザーが増やしていくコンテンツ。いわゆる UGC）の直接アクセスと正しい 404

これが無いプロダクトは、Next の機能を全部「過剰」として抱えている。クロスオーダーの発注画面は 4 つとも無い

## 7. 判断手順（2 段）

- ステップ 0: SSR が要るか（上の 4 つのどれかがあるか）
- ステップ 1: 要らないなら SPA + 既存 BFF（TanStack Router / React Router SPA mode）。要るなら Next か React Router framework mode。Next を選ぶなら「画像最適化・og・middleware を使うか、使わないなら無効化するか、セキュリティリリースを誰が追従するか」を書き出す

## 8. まとめ

- 鉄槌は選択肢を消すことではなく「とりあえず」を消すこと
- 「うちは SSR フレームワークすら本来は要らなかった。RR を選んだのは loader/action の書き味のため」と正直に書く
- 採用ページへ

---

## 実測値の要点（記事に載せる数字の候補。正確な値は `docs/results/COMPARISON.md`）

データ層は共有モック（固定 150 ms）。Next はサーバで、SPA はブラウザで同じ関数を呼ぶ。

| 観点 | Next.js 16.3 | TanStack Router SPA | 読み方 |
| --- | --- | --- | --- |
| 書いたコード（非空行） | 473 行 / 22 ファイル | 582 行 / 19 ファイル | SPA の方が多い。検索の型、モーダル状態、データ層ラッパ、静的配信サーバの分。隠さない |
| 本番依存パッケージ数 / サイズ | 59 / 428 MB | 13 / 12 MB | 35 倍。sharp/libvips、SWC、vendored React+RSC が主因 |
| RSC ランタイム同梱 | あり | なし | React2Shell が刺さる口 |
| sharp / libvips 同梱 | あり | なし | AVIF RCE が刺さる口 |
| クリーンビルド | 12.9 秒 | 1.4 秒 | Next は tsc + eslint 内蔵。注記する |
| デプロイ一式 | 205 MB (standalone) | 0.4 MB (静的ファイルのみ) | 540 倍。S3 に置いて終わり |
| コールドスタート | 1,170 ms | 530 ms | 参考値（SPA 側は静的サーバの起動） |
| RSS | 222 MB | 66 MB | 参考値 |
| `/` の HTML | 24.0 KB | 0.8 KB | SSR の有無そのもの |
| `/` の JS (gzip) | 140 KB | 91 KB | RSC で減るどころか増えている |
| `/` の画像 | 16 KB (webp) | 80 KB (PNG) | 画像最適化の恩恵は本物 |
| `/` で最初の商品カードが出るまで (p50, localhost) | 379 ms | 319 ms | 参考値。記事には Chrome 実測（通常 536 vs 388 ms、制限環境 1,084 vs 1,748 ms）を使う |
| サーバの p50 `/` | 162 ms | 1 ms | Next は SSR でモックを待つ。SPA は静的ファイル。比べる意味は薄い |

露出している口（アプリが定義していないのに 404 以外を返すパス）:

| 口 | Next.js | SPA |
| --- | --- | --- |
| `/_next/image`（WebP 変換まで動く） | 200 | 404 |
| `/products/:id/opengraph-image`（next/og） | 200 | 404 |
| `POST /` + `Next-Action` | 受け付けて 404 | 404 |
| `RSC: 1` ヘッダ | 200 text/x-component | 404 |
| `/api/products` | 200（Route Handler） | 404（データはブラウザ内） |

脆弱性履歴（osv.dev、2026-10-05）:

| | Next.js | TanStack Router | RSC runtime |
| --- | --- | --- | --- |
| 総数 | 67 | 5 | 8 |
| CRITICAL / HIGH | 5 / 26 | 1 / 0 | 1 / 6 |
| 2026 年 | 34 | 5（全部 5 月の供給網事件） | 4 |
| 未認証 RCE（直近 12 か月） | 4 | 0（供給網はコード脆弱性と別枠） | 1 |

## 執筆メモ

- 数字は `pnpm advisories && pnpm measure && pnpm report` で再生成できる
- 検証済みの事実（2026-10-05、next@16.3.8）: `next/image` を一行も使わなくても `/_next/image` は 200 を返し webp 変換も動く。`images.unoptimized: true` で 404 になる
- 一次情報リンク
  - https://nextjs.org/blog/august-2026-security-release
  - https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j (next/og RCE)
  - https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4 (AVIF RCE)
  - https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36 (Windows RCE)
  - https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp (React2Shell / Next)
  - https://osv.dev/vulnerability/GHSA-fv66-9v8q-g76r (CVE-2025-55182 / react-server-dom)
  - https://osv.dev/vulnerability/GHSA-g7cv-rxg3-hmpx (@tanstack/* malware)
- 会社ブログとして避けること: Vercel への人格攻撃、「Next は終わり」系の断定。数字と機能の対応関係だけで語る
- 想定文字数: 7,000〜9,000 字。表は 5 つまで
