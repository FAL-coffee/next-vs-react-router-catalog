import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route("products/:id", "routes/product.tsx"),
  route("api/products", "routes/api.products.ts"),
  route("api/products/:id", "routes/api.product.ts"),
  // Catch-all so unknown URLs render the 404 branch of the root ErrorBoundary
  // with a real 404 status, same as Next's not-found.tsx.
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
