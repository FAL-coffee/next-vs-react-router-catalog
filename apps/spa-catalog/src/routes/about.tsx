import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About | Catalog (TanStack Router SPA)" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="prose max-w-none">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="mt-4">
        このアプリは Vite + TanStack Router の SPA で実装された比較用カタログです。データは別プロセスの API（Hono）から取ります。
        同じ仕様のアプリが Next.js (App Router) でも実装されています。
      </p>
      <ul className="mt-4 list-disc pl-6 text-sm">
        <li>一覧・検索: loader + validateSearch</li>
        <li>クイックビュー: search param + route masking</li>
        <li>認証: API が発行する Cookie セッション、beforeLoad でガード</li>
        <li>認可: ロールは API 側で検査、画面はそれを写すだけ</li>
        <li>画像: 素の &lt;img&gt;（最適化は CDN の仕事）</li>
      </ul>
    </div>
  );
}
