import { Link } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

/**
 * ルーター全体の既定エラー表示。notFound() と違い、throw されたエラーは
 * 最も近いルートの errorComponent が受け取り、ルートまで伝播しない。
 * そのためルーターの `defaultErrorComponent` として登録している。
 */
export function ErrorPage({ error }: ErrorComponentProps) {
  return (
    <div className="space-y-3" data-testid="error-boundary">
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p className="text-sm text-zinc-600">{import.meta.env.DEV && error instanceof Error ? error.message : "しばらくしてから再度お試しください。"}</p>
      <Link to="/" className="rounded border px-3 py-1 text-sm">
        トップへ戻る
      </Link>
    </div>
  );
}
