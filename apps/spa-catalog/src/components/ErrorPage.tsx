import { Link } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

/**
 * Router-wide default. Unlike notFound(), a thrown error is caught by the
 * nearest route's errorComponent and does not bubble to the root, so this is
 * registered as `defaultErrorComponent` on the router.
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
