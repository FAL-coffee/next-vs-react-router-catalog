import { useNavigate } from "@tanstack/react-router";
import { CATEGORIES } from "#/lib/format";

export function SearchForm({ q, category }: { q: string; category: string }) {
  const navigate = useNavigate();
  return (
    <form
      role="search"
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        navigate({
          to: "/",
          search: { q: String(fd.get("q") ?? "") || undefined, category: String(fd.get("category") ?? "") || undefined },
        });
      }}
    >
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="商品名・産地で検索"
        aria-label="検索"
        className="min-w-56 flex-1 rounded border px-3 py-2"
      />
      <select name="category" defaultValue={category} aria-label="カテゴリ" className="rounded border px-3 py-2">
        <option value="">すべて</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-white">
        検索
      </button>
    </form>
  );
}
