"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function Modal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const close = () => router.back();
  return (
    <dialog ref={ref} data-testid="quick-view" onClose={close} className="m-auto w-full max-w-3xl rounded-lg p-6 backdrop:bg-black/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-zinc-500">クイックビュー</span>
        <button onClick={close} className="rounded border px-2 py-0.5 text-sm">
          閉じる
        </button>
      </div>
      {children}
    </dialog>
  );
}
