import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Product, User } from "@catalog/data";
import { getProduct } from "#/lib/api";
import { ProductDetail } from "./ProductDetail";

/** The SPA counterpart of Next's `@modal/(.)products/[id]` intercepting route. */
export function QuickView({ id, user, search }: { id: string; user: User | null; search: { q?: string; category?: string } }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDialogElement>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const close = () => navigate({ to: "/", search: { ...search, quick: undefined } });

  useEffect(() => {
    ref.current?.showModal();
    let alive = true;
    getProduct(id)
      .then((p) => alive && setProduct(p))
      .catch(() => {
        if (alive) void navigate({ to: "/", search: { ...search, quick: undefined } });
      });
    return () => {
      alive = false;
    };
  }, [id, navigate, search]);

  return (
    <dialog
      ref={ref}
      data-testid="quick-view"
      onClose={close}
      className="m-auto w-full max-w-3xl rounded-lg p-6 backdrop:bg-black/40"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-zinc-500">クイックビュー</span>
        <button onClick={close} className="rounded border px-2 py-0.5 text-sm">
          閉じる
        </button>
      </div>
      {product ? (
        <>
          <ProductDetail product={product} user={user} onReserved={setProduct} />
          <Link to="/products/$id" params={{ id }} className="mt-4 inline-block text-sm underline">
            詳細ページで開く
          </Link>
        </>
      ) : (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      )}
    </dialog>
  );
}
