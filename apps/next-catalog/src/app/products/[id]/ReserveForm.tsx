"use client";

import { useActionState } from "react";
import { reserveAction, type ReserveState } from "./actions";

const initial: ReserveState = { status: "idle" };

export function ReserveForm({ id, stock }: { id: string; stock: number }) {
  const [state, action, pending] = useActionState(reserveAction, initial);
  return (
    <form action={action} className="space-y-3" data-testid="reserve-form">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-2 text-sm">
        数量
        <input
          type="number"
          name="quantity"
          min={1}
          defaultValue={1}
          className="w-20 rounded border px-2 py-1"
        />
      </label>
      <button
        type="submit"
        disabled={pending || stock === 0}
        className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "送信中…" : stock === 0 ? "在庫切れ" : "予約する"}
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
