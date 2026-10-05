import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3" data-testid="not-found">
      <h1 className="text-2xl font-bold">404</h1>
      <p>お探しのページは見つかりませんでした。</p>
      <Link href="/" className="text-sm underline">
        トップへ戻る
      </Link>
    </div>
  );
}
