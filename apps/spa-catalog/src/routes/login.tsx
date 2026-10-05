import { useState } from "react";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { ApiError, invalidateMe, login } from "#/lib/api";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s.redirect === "string" ? { redirect: s.redirect } : {}),
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ href: search.redirect ?? "/mypage" });
  },
  head: () => ({ meta: [{ title: "ログイン | Catalog (TanStack Router SPA)" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect: to } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <p className="text-xs text-zinc-500">デモ: taro / taro（member）、admin / admin（admin）</p>
      <form
        className="space-y-3"
        data-testid="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setPending(true);
          try {
            await login(String(fd.get("id") ?? ""), String(fd.get("password") ?? ""));
            invalidateMe();
            await router.invalidate();
            await navigate({ href: to ?? "/mypage" });
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "ログインに失敗しました");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="block text-sm">
          ID
          <input name="id" autoComplete="username" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block text-sm">
          パスワード
          <input name="password" type="password" autoComplete="current-password" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50">
          ログイン
        </button>
        {error && (
          <p role="alert" data-testid="login-error" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
