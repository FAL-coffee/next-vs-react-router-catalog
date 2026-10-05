"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(loginAction, {} as LoginState);
  return (
    <form action={action} className="space-y-3" data-testid="login-form">
      <input type="hidden" name="redirect" value={redirectTo ?? ""} />
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
      {state.error && (
        <p role="alert" data-testid="login-error" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
