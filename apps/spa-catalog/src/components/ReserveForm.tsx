import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Product, User } from "@catalog/data";
import { ApiError, reserve } from "#/lib/api";

type State = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

export function ReserveForm({ product, user, onReserved }: { product: Product; user: User | null; onReserved?: (p: Product) => void }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [pending, setPending] = useState(false);
  const router = useRouter();

  if (!user) {
    return (
      <p className="text-sm" data-testid="reserve-login-required">
        予約には
        <Link to="/login" search={{ redirect: `/products/${product.id}` }} className="underline">
          ログイン
        </Link>
        が必要です。
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      data-testid="reserve-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const quantity = Number(new FormData(e.currentTarget).get("quantity") ?? 0);
        setPending(true);
        try {
          const r = await reserve(product.id, quantity);
          setState({ status: "ok", message: r.message });
          onReserved?.(r.product);
          await router.invalidate();
        } catch (err) {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "予約に失敗しました" });
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        数量
        <input type="number" name="quantity" min={1} defaultValue={1} className="w-20 rounded border px-2 py-1" />
      </label>
      <button
        type="submit"
        disabled={pending || product.stock === 0}
        className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "送信中…" : product.stock === 0 ? "在庫切れ" : "予約する"}
      </button>
      {state.status !== "idle" && (
        <p
          role="status"
          data-testid="reserve-result"
          data-status={state.status}
          className={state.status === "ok" ? "text-green-700" : "text-red-700"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
