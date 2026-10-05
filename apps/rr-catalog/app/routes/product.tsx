import { data, Form, Link, useNavigation } from "react-router";
import { CATEGORIES, formatPrice, getProduct, reserveProduct } from "@catalog/data";
import type { Route } from "./+types/product";

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  return [
    { title: `${loaderData?.product.name ?? "Not Found"} | Catalog (React Router)` },
  ];
}

export function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.searchParams.get("fail") === "1") {
    throw new Error("Intentional failure for error-boundary comparison");
  }
  const product = getProduct(params.id);
  if (!product) throw data("Not Found", { status: 404 });
  return { product };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const quantity = Number(formData.get("quantity") ?? 0);
  const result = reserveProduct(params.id, quantity);
  if (!result.ok) {
    return data({ status: "error" as const, message: result.error }, { status: 400 });
  }
  return {
    status: "ok" as const,
    message: `${result.product.name} を ${result.quantity} 点予約しました（残り ${result.product.stock}）`,
  };
}

export default function ProductPage({ loaderData, actionData }: Route.ComponentProps) {
  const { product } = loaderData;
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";
  const categoryLabel =
    CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <img
        src={`/images/${product.id}.png`}
        alt={product.name}
        width={640}
        height={400}
        className="w-full rounded-lg border"
      />
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          <Link to={`/?category=${product.category}`} className="hover:underline">
            {categoryLabel}
          </Link>
          {" · "}
          {product.origin}
        </p>
        <h1 className="text-2xl font-bold" data-testid="product-name">
          {product.name}
        </h1>
        <p className="text-xl" data-testid="product-price">
          {formatPrice(product.price)}{" "}
          <span className="text-sm text-zinc-500">/ {product.unit}</span>
        </p>
        <p className="text-zinc-700">{product.description}</p>
        <p className="text-sm" data-testid="product-stock">
          {product.stock > 0 ? `在庫 ${product.stock}` : "在庫切れ"}
        </p>
        <Form method="post" className="space-y-3" data-testid="reserve-form">
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
            disabled={pending || product.stock === 0}
            className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {pending ? "送信中…" : product.stock === 0 ? "在庫切れ" : "予約する"}
          </button>
          {actionData && (
            <p
              role="status"
              data-testid="reserve-result"
              data-status={actionData.status}
              className={actionData.status === "ok" ? "text-green-700" : "text-red-700"}
            >
              {actionData.message}
            </p>
          )}
        </Form>
        <Link to="/" className="inline-block text-sm text-zinc-600 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>
    </article>
  );
}
