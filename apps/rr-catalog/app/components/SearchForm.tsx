import { Form } from "react-router";
import { CATEGORIES } from "@catalog/data";

export function SearchForm({ q, category }: { q: string; category: string }) {
  return (
    <Form method="get" action="/" className="flex flex-wrap gap-2" role="search">
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="商品名・産地で検索"
        aria-label="検索"
        className="min-w-56 flex-1 rounded border px-3 py-2"
      />
      <select
        name="category"
        defaultValue={category}
        aria-label="カテゴリ"
        className="rounded border px-3 py-2"
      >
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
    </Form>
  );
}
