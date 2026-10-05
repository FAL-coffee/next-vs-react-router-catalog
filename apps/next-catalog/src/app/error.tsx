"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3" data-testid="error-boundary">
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p className="text-sm text-zinc-600">
        {process.env.NODE_ENV === "development" ? error.message : "しばらくしてから再度お試しください。"}
      </p>
      <button onClick={reset} className="rounded border px-3 py-1 text-sm">
        再試行
      </button>
    </div>
  );
}
