# とりあえずNext.jsの選択肢に鉄槌を下す 〜SPAで足りないのはどこか、Next.jsの機能を全部作って確かめた〜

# はじめに

お疲れ様です。クロスマート株式会社でフロントエンドのタスクを主に担当しております。ナイスガイの福留です。

フロントエンジニアの皆様方、最近 `npm audit` は赤いですか？

赤いですよね。私も赤いです。

2026年9月、Next.js の Critical が1か月で3件出ました。AVIF 画像最適化の未認証 RCE、Windows ホストの未認証 RCE、`next/og` の RCE です。
GitHub の Security Alert が毎週のように「Next.js の脆弱性が見つかりました」と教えてくれるので、最近は通知を見た瞬間に「またか」と口から出るようになりました。

ここで少し冷静になって考えてみると、不思議なことに気づきます。

**全部、うちでは使っていない機能なんです。**

画像最適化は使っていない。og 画像は生成していない。Windows でホストもしていない。
それでも alert は飛んでくるし、パッチ追従の PR は切らないといけない。

「使っていない機能のためにアップデートする」という作業を、私たちはいつから当たり前だと思うようになったんでしょうか。

ちなみに私自身は、3年前に[酔った勢いで Next.js 13 の app ディレクトリを敵情調査した記事](https://qiita.com/FAL-coffee/items/e4bcc16b065a737c9537)を書いたくらいには Next.js に興味がある人間です。
会社の PJ では Remix v2 を選定し、現在は React Router に移行済みです。
そして今回、さらに一歩踏み込んで「そもそも SSR フレームワーク、要る？ SPA で足りるのでは？」と疑ってみることにしました。

タイトルは煽っていますが、鉄槌を下すのは Next.js ではなく「とりあえず」の方です。
最後まで読んでいただければ幸いに存じます。

## この記事の対象読者

- React で B2B の業務画面を作っていて、フレームワーク選定に関わる方
- 「Next でいいでしょ」と言われたときの反論材料が欲しい方
- 逆に、Next.js を選んでいて、自分が何をメンテ対象として抱えているのか自覚したい方

## この記事を読んでわかること

- この1年で Next.js に出た脆弱性が、どの機能に刺さったのか
- Next.js の機能（Parallel Routes、Intercepting Routes、Server Actions、next/og、next/image など）を一つずつ SPA で再現するとどうなるのか
- その結果「本当に SPA で足りないもの」として何が残るのか

## 書かないこと

- Next.js と TanStack Router の基本的な書き方
- Vercel への人格攻撃
- 「Next.js は終わり」のような断定

# 事実: この1年の Next.js Critical を時系列で並べる

まず感情を抜きにして、osv.dev に登録されている advisory を並べます。

| 公開 | ID | 内容 | 刺さった機能 |
| --- | --- | --- | --- |
| 2025/03 | [CVE-2025-29927](https://osv.dev/vulnerability/GHSA-f82v-jwr5-mffw) | Middleware の認可バイパス | middleware |
| 2025/12 | [GHSA-9qr9-h5gf-34mp](https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp)（React2Shell） | RSC flight protocol 経由の未認証 RCE | RSC ランタイム |
| 2026/09/08 | [GHSA-2xp9-vwfh-vxw4](https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4) | AVIF 画像最適化で未認証 RCE（libheif） | Image Optimization |
| 2026/09/08 | [CVE-2026-75604](https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36) | Windows ホストで未認証 RCE | Pages/App Router 併用 |
| 2026/09/30 | [GHSA-vcvr-r3jv-pc5j](https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j) | `next/og` ImageResponse で RCE | OG 画像生成 |

Critical だけで5件、うち4件が未認証の RCE です。
加えて 2026 年は HIGH が 16 件あり、内訳は Middleware/Proxy バイパスが5件、Server Actions 経由の SSRF と DoS、RSC の DoS が連発、といった具合です。

公平のために書いておくと、Vercel にホストしていればプラットフォーム側の WAF で守られた期間があるものも含まれています。
ただ、弊社のようにセルフホストしている場合、守ってくれるのは自分たちの `pnpm update` だけです。

右端の列を見てください。**middleware、RSC、画像最適化、OG 画像生成。** 全部 Next.js が「同梱している機能」です。
そして、うちのプロダクトはこのどれも使っていません。

# 問い直し: その機能、うちは使ってる？

「とりあえず Next.js」という選び方には、ひとつ飛ばしている判断があります。

**そもそも SSR が要るのか？** です。

Next.js を選んだ時点で、SSR + RSC + Server Actions が既定になります。
プロダクトの要件を見る前に、レンダリング方式が決まってしまう。
そして一度決まると、「SSR 前提で同梱されている機能」が全部ついてきます。使っても使わなくても。

なので今回は、**Next.js の機能を一つずつ「SPA + 薄い API で再現するとどうなるか」を実際に作って確かめる**ことにしました。
再現できたものは「SSR フレームワークでなくてもよかったもの」。再現できなかったものが「Next.js が本当に必要なとき」の定義になるはずです。

# 実験: 同じカタログを Next.js と TanStack Router の SPA で作る

## 題材

商品カタログです。DB は使わず、JSON とインメモリの在庫で動きます。
一覧・検索・クイックビュー（モーダル）・詳細・予約フォーム・JSON API・404・エラー境界。

データ層は共有のモック関数で、どの呼び出しも固定で 150 ms 待ってから返します。Next.js はそれをサーバで、SPA はブラウザで呼びます。SPA 側に本物の API を立てると「Next.js vs SPA + API サーバ」の 2 対 1 になって数字の帰属が曖昧になるので、**データ取得のコストが完全に同じ**状態で比べることにしました。

ルールはひとつ。**どちらも公式 CLI の既定テンプレートから始めて、設定をほぼ触らない。**
「とりあえず」を再現するためです。

| | Next.js 16（App Router） | TanStack Router SPA |
| --- | --- | --- |
| 一覧・検索 | Server Component + `searchParams` | `loader` + `validateSearch` |
| クイックビュー | Parallel Route `@modal` + Intercepting Route `(.)products/[id]` | `?quick=<id>` + route masking |
| 詳細 + メタデータ | `generateMetadata` + `notFound()` | `head` + `notFound()` |
| OG 画像 | `next/og` の `ImageResponse` | なし |
| 予約 | Server Action + `useActionState` | `useState` + データ層呼び出し（実運用なら `fetch`） |
| 画像 | `next/image`（既定） | `<img>` |

Next.js 側には、わざと「テクい機能」を盛りました。
Parallel Routes と Intercepting Routes でクイックビューのモーダル。3年前に私が「はあ？」と言ったあれです。
`next/og` で OG 画像。`next/image` は既定のまま。

これらを SPA 側で、**似た形で、やりすぎない程度に**再現しました。

リポジトリはこちらです。計測は `pnpm measure && pnpm report` で全部再現できます。

https://github.com/FAL-coffee/next-vs-react-router-catalog

## 再現してみた結果

結論から表にします。

| Next.js の機能 | SPA 側の再現 | 再現コスト | 本当に足りない？ |
| --- | --- | --- | --- |
| SSR / 初期 HTML | なし。空の `index.html` + JS | 0 | **未ログインの公開ページがあるなら足りない** |
| RSC（クライアント JS 削減） | ルート単位のコード分割 | 0 | 今回の規模では JS 量は Next の方が多かった。不要 |
| Server Actions | `useState` + データ層呼び出し | 低 | **JS 無効で動かすのは無理**。それ以外は不要 |
| Route Handlers | なし。実運用では既存の BFF | 低 | 不要。BFF が既にある会社は最初からこれ |
| Parallel + Intercepting Routes | search param + route masking | 低。むしろ短い | 不要 |
| Middleware（proxy） | `beforeLoad` + API 側の検査 | 低 | 不要。むしろバイパス系の口が消える |
| Image Optimization | `<img>`。最適化は CDN の仕事 | 中 | **外部画像を大量に扱うなら足りない** |
| Metadata / OG 画像 | title のみ。OG 画像は作れない | 高 | **SNS に貼られる公開ページがあるなら足りない** |
| Link prefetch | `defaultPreload: "intent"` | 0 | 不要 |
| 型付きルート | `createFileRoute` | 0 | 不要。SPA 側の方が search params まで型が付く |
| 動的ルートの直接アクセス / 404 | 既知の ID をビルド時に静的生成（`generateStaticParams` 相当）。未知は本物の 404 | 低 | **ビルド時に列挙できないルートがあるなら足りない** |

「不要」が並びすぎて逆に不安になりますね。
いくつか、実際のコードで見てみます。

### Intercepting Routes vs route masking

一覧から商品をクリックするとモーダルで詳細が出て、URL は `/products/:id` になり、リロードすると本物の詳細ページになる、というやつです。

Next.js 側。`app/@modal/(.)products/[id]/page.tsx` に、こう書きます。

```tsx
export default async function QuickViewModal({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = getProduct(id);
  const user = await getSession();
  return (
    <Modal>
      {product ? <ProductDetail product={product} user={user} /> : <p>商品が見つかりません。</p>}
    </Modal>
  );
}
```

これに加えて `app/@modal/default.tsx`（`null` を返すだけ）と、`layout.tsx` に `modal` スロットを受ける口が要ります。
`(.)` が「同じ階層のルートを横取りする」という意味で、`@modal` が「並列に描画するスロット」です。
3年前に「はあ？」と言った私も、今回は30分で書けました。慣れというのは恐ろしいものです。

TanStack Router 側。カードの `<Link>` に `mask` を付けるだけです。

```tsx
<Link
  to="/"
  search={{ ...search, quick: product.id }}
  mask={{ to: "/products/$id", params: { id: product.id }, unmaskOnReload: true }}
>
```

実体は「一覧ルートに `?quick=<id>` を付けて遷移する」で、アドレスバーだけ `/products/<id>` に見せています。
`unmaskOnReload: true` でリロード時に本物の詳細ページに行きます。
一覧ルートは `quick` があればモーダルを描く、というだけ。

正直、こちらの方が「何が起きているか」が読めます。
Next.js の方はファイルの置き場所が仕様なので、初見の人は `(.)` と `@` を調べるところから始まります。

### Server Actions vs ブラウザから呼ぶ

予約フォームです。数量を送って在庫を減らし、結果のメッセージを出します。

Next.js 側。`"use server"` の関数を `useActionState` に渡します。

```ts
"use server";
export async function reserveAction(_prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const result = reserveProduct(String(formData.get("id")), Number(formData.get("quantity")));
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/products/${id}`);
  return { status: "ok", message: `${result.product.name} を ${result.quantity} 点予約しました` };
}
```

TanStack Router 側。ただの関数呼び出しです（実運用ならここが BFF への `fetch` になります）。

```ts
const r = await reserve(product.id, quantity);   // モックのデータ層。実運用なら fetch
setState({ status: "ok", message: r.message });
await router.invalidate();                        // loader を取り直す
```

Server Action の方が「API を書いた覚えがないのにサーバで動く」ので魔法っぽいです。
ただし `POST /` に `Next-Action` ヘッダを付ければ外から叩ける口が生えています（後述）。
SPA 側は BFF を自分で持つ前提なので、何が公開されているかは BFF を見ればわかります。

そして一つ、はっきりした差があります。**Server Action は JavaScript が無効でも動きます。** SPA の `fetch` は動きません。
これは SPA が「足りない」側に残る項目です。

## 抱え込むものは全然違う

ここからが本題です。

| | Next.js | SPA + API | 比 |
| --- | --- | --- | --- |
| 書いたコード（非空行） | 473 行 | 582 行 | SPA の方が多い |
| 本番依存パッケージ | 59 個 / 428 MB | 13 個 / 12 MB | 35x |
| RSC ランタイムを同梱 | はい | いいえ | |
| sharp / libvips を同梱 | はい | いいえ | |
| クリーンビルド | 12.9 秒 | 1.4 秒 | 9x |
| デプロイ一式 | 205 MB（standalone） | 0.4 MB（静的ファイルのみ） | 540x |
| 常駐メモリ RSS | 222 MB | 66 MB | 3.4x |

書いたコードは SPA の方が多いです。検索条件の型定義、モーダルの状態、データ層の薄いラッパ、静的配信用の 40 行のサーバを自分で書いたので当然ですね。ここは隠しません。
（ビルド時間は、Next.js は `next build` の中で `tsc` と ESLint を回しているので、そのまま 9x と受け取るのは不公平です。）

見てほしいのは依存とデプロイ一式です。
Next.js の 428 MB の正体は、sharp + libvips（linux-x64 と linuxmusl の2種類）、SWC のネイティブバイナリ、そして vendored された React と RSC ランタイムです。

**この中の sharp/libvips と RSC ランタイムが、まさに AVIF RCE と React2Shell が刺さった場所です。**
使う・使わないに関わらず、`create-next-app` した時点で node_modules に入っています。

一方の SPA は、静的ファイルだけで 0.4 MB。S3 に置いて終わりです。

## 露出している口を数える

ここが一番書きたかった部分です。

アプリが定義していないパスに対して、両サーバが何を返すかを調べました。
`404` 以外が返るものは、自分のコードとは無関係にフレームワークが生やしている口です。

| リクエスト | 意味 | Next.js | SPA |
| --- | --- | --- | --- |
| `GET /_next/image?url=/images/x.png&w=640&q=75` | 画像最適化 | **200** (image/png) | 404 |
| 同上 + `Accept: image/webp` | フォーマット変換まで動く | **200** (image/webp) | 404 |
| `GET /products/x/opengraph-image` | `next/og` の OG 画像生成 | **200** (image/png) | 404 |
| `GET /` + `RSC: 1` ヘッダ | RSC flight payload | **200** (text/x-component) | 404 |
| `POST /` + `Next-Action` ヘッダ | Server Action の受け口 | **受け付けて id 不一致で 404** | 404 |

Next.js 側を見てください。
`/_next/image` に外から任意の `url` と `w` と `q` を渡せて、しかも `Accept` ヘッダ次第で webp への変換まで走ります。
2026年9月の AVIF RCE はここに刺さりました。
`/products/x/opengraph-image` も同じです。9月30日の RCE はここです。

「それは `next/image` を使っているからでしょ」と思った方。私もそう思ったので、`next/image` を一行も使わない状態でビルドし直して叩いてみました。

| 状態 | `GET /_next/image?url=...` | 同上 + `Accept: image/webp` |
| --- | --- | --- |
| `next/image` を使っている | 200 (image/png) | 200 (image/webp) |
| `next/image` を一行も使っていない | **200 (image/png)** | **200 (image/webp)** |
| `images: { unoptimized: true }` を書いた | 404 | 404 |

はあ？

`next/image` を使っていなくても、`next start` した時点でこの口は開いています。
閉じるには `images.unoptimized: true` を**自分で書く**必要があります。

SPA 側で開いている口はゼロです。静的ファイル以外は全部 404。
「表面積 = 自分が書いたルート + フレームワークが生やす口」で、両方ゼロなのが静的な SPA です（その代わり、口は全部 BFF 側に移ります）。

## 初期表示とページ重量

| | Next.js | SPA |
| --- | --- | --- |
| `/` の HTML | 24.0 KB | 0.8 KB |
| `/` の JS（gzip） | 140 KB | 91 KB |
| `/` の画像転送量 | 16 KB（webp 化） | 80 KB（PNG そのまま） |
| `/` を開いて最初の商品カードが出るまで（p50） | 379 ms | 319 ms |

最後の行が、ユーザーが体感する差です。両方ともデータ層の 150 ms を含んでいます。
localhost では SPA の方が 60 ms ほど速く出ました。Next.js はサーバで 150 ms 待ってから HTML を作り始めるのに対し、SPA は空の HTML と JS を先に出してブラウザで 150 ms 待つので、待ち時間の置き場所が違うだけで総量は同じです。
ただしこれは JS の転送がタダの localhost の話です。遅い回線では、SPA は 91 KB の JS を落とし終えるまで何も出せません。SSR の価値はそこにあります。
HTML の差は SSR の有無そのもので、SPA は初期表示に JS の実行が要ります。
JS は Next.js の方が 50 KB 多く、この規模の画面では RSC による「クライアント JS 削減」の恩恵は出ませんでした。

そして画像。Next.js の画像最適化は本物です。16 KB と 80 KB は大きな差です。
だからこそ「使うなら使う、使わないなら切る」と選定時に決めるべきで、「とりあえず入っているから有効」が一番良くないんです。

## 地味に刺さった差

作っている最中に踏んだ小ネタを4つ。

- **Next.js はサーバコードをルート単位で分割する**ので、モジュールスコープのシングルトンがルート間で複製されます。`.next/server` を覗くと共有データのモジュールが4チャンクに現れました。結局 `globalThis` に逃がしました。Prisma のドキュメントに `globalThis` の例が載っている理由を、身をもって理解しました
- **React 19 は Server Action の完了後にフォームをリセットします。** 予約でエラーが返ると、入力した数量が初期値に戻ります。SPA 側は `useState` なので残ります。どちらが正しいかはさておき、知らないと「なんで？」になります
- **TanStack Router は search params を JSON として読みます。** `?fail=1` は数値の `1` で届きます。`validateSearch` で `String()` しましょう
- **静的な SPA には「動的ルート」が存在しません。** Vercel に置いて `/products/brazil-cerrado` をリロードしたら CDN の 404 が出ました。ホスティングの rewrite で `index.html` に回せば直りますが、それはフレームワークの比較ではなくなるのでやめました。代わりに、商品 ID はビルド時に分かっているので、ID ごとに `index.html` を吐く 30 行の Vite プラグインを書きました。Next.js の `generateStaticParams` と同じ発想です。副産物として、未知の ID には CDN が本物の 404 を返すようになりました

# SPA 側の傷も並べる

「じゃあ SPA は安全なのか」と言われると、そんなことはありません。
ここを隠すと記事の信頼性が死ぬので、ちゃんと書きます。

| | Next.js | TanStack Router | RSC runtime |
| --- | --- | --- | --- |
| 総数 | 67 | 5 | 8 |
| CRITICAL / HIGH | 5 / 26 | 1 / 0 | 1 / 6 |
| 2026 年 | 34 | 5 | 4 |

TanStack Router の5件は、全部 **2026年5月の npm サプライチェーン攻撃**です。`@tanstack/*` の複数パッケージに、クラウド認証情報や SSH 鍵を盗む悪性コードが混入しました。
コードの脆弱性ではなく供給網の話なので、本記事の軸とは別物です。でも「薄いから安全」と言った瞬間に、これが返ってきます。lockfile と provenance の確認は、フレームワークが薄くても要ります。

もうひとつ、SPA にしたことで消えたのではなく**移動した**ものがあります。
在庫のような共有状態は、SPA ではブラウザのタブに閉じます。今回はモックなので許容しましたが、本番では結局 BFF が要ります。
「SPA で済む」は「BFF が既にある」とセットの話で、API 側の責務（入力検証、CSRF、レート制限、認可）は消えていません。Next.js はそれを `"use server"` の裏に隠しているだけで、どちらにせよ誰かが持ちます。

# 残ったもの: Next.js が本当に必要なとき

表で「足りない」と判定されたのは、この4つだけでした。

1. **未ログインで見られる公開ページの初期 HTML**（SEO、初期表示）
2. **SNS シェア用の OG 画像**
3. **JavaScript 無効でも動くフォーム**
4. **ビルド時に列挙できない動的ルート**（ユーザー生成コンテンツなど）への直接アクセスと、その正しい 404

これが**無い**プロダクトは、Next.js の機能を全部「過剰」として抱えています。

クロスオーダーの発注画面は、4つとも無いです。
全部ログイン後の画面で、SNS に貼られることはなく、JS 無効の端末からの発注はなく、動的ルートは API から引けば済みます。

つまり、うちは SSR フレームワーク自体が本来は要らなかった。
Remix v2 を選んだのは loader / action の書き味とフォームの扱いやすさのためで、「SSR が必要だから」ではありませんでした。
これは選定時に言語化しておくべきだったと、今回作ってみて思いました。

# 判断手順

鉄槌を下すだけでは無責任なので、うちならこう判断する、という手順を置いておきます。

**ステップ0: SSR が要るか**

上の4つのどれかがプロダクトにあるか。無いなら SPA + 既存の BFF で済みます。TanStack Router でも React Router の SPA mode でも。

**ステップ1: SSR が要るなら、どのフレームワークか**

Next.js か、React Router の framework mode か。
Next.js を選ぶなら、選定時に以下を書き出してください。

- 画像最適化を使うか。使わないなら `images.unoptimized: true`
- `next/og` を使うか。使わないなら `opengraph-image` ファイルを置かない（置いた瞬間にエンドポイントが生える）
- Middleware（proxy）で認可をやるか。やるなら、過去6件のバイパスを読んでからにする。そして API 側でも必ず検査する
- `poweredByHeader: false`
- セキュリティリリースを誰がいつ追従するか

これが全部埋まるなら、それはもう「とりあえず」ではありません。

# まとめ

鉄槌を下したかったのは Next.js ではなく、「とりあえず」という選び方でした。

Next.js の機能を一つずつ SPA で再現してみて、本当に足りないものは4つしか残りませんでした。
その4つが無いプロダクトは、デプロイ一式で 100 倍、本番依存で 30 倍のものを抱えていて、しかもその中に、この1年の Critical が刺さった部品がそのまま入っています。

SPA にも傷はあります。供給網の事件も、API 側の責務も。
それを把握した上で選ぶのと、把握せずに「とりあえず」で選ぶのとでは、`npm audit` が赤くなった朝の気持ちが全然違います。

計測は全部リポジトリに置いてあるので、「うちの条件だと違う」という方はぜひ `pnpm measure` して殴り返してください。

最後まで読んでいただきありがとうございました。
個人の活動も、こういう偏った検証も評価いただける素敵な弊社です。
我らが開発チームに興味を持ってくださったら、以下採用ページもご覧いただきたいです！

https://xorder.notion.site

---

## 参考リンク

- [Next.js August 2026 Security Release](https://nextjs.org/blog/august-2026-security-release)
- [GHSA-vcvr-r3jv-pc5j: next/og ImageResponse RCE](https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j)
- [GHSA-2xp9-vwfh-vxw4: AVIF Image Optimization RCE](https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4)
- [GHSA-p293-qw3h-jr36: Windows RCE](https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36)
- [GHSA-9qr9-h5gf-34mp: React2Shell (Next.js)](https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp)
- [GHSA-fv66-9v8q-g76r: CVE-2025-55182 (react-server-dom)](https://osv.dev/vulnerability/GHSA-fv66-9v8q-g76r)
- [GHSA-g7cv-rxg3-hmpx: Malware in @tanstack/* packages](https://osv.dev/vulnerability/GHSA-g7cv-rxg3-hmpx)
- [Remix v3 にコントリビュート（前回記事）](https://xmart-techblog.hatenablog.com/entry/2025/12/01/122639)
- [Next.js ver13のappディレクトリをなんとなく批判したいので、酔った勢いで敵情を調査してみた（2023）](https://qiita.com/FAL-coffee/items/e4bcc16b065a737c9537)
