import { ImageResponse } from "next/og";
import { formatPrice, getProduct } from "@catalog/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#18181b",
          color: "white",
          fontSize: 64,
        }}
      >
        <div>{product?.name ?? "Not Found"}</div>
        {product && <div style={{ fontSize: 40, color: "#a1a1aa", marginTop: 24 }}>{formatPrice(product.price)}</div>}
      </div>
    ),
    size,
  );
}
