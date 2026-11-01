import type { Metadata } from "next";
import ProductDetails from "@admin/products/ProductDetails";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Product" };

export default function Page() {
  return <ProductDetails />;
}
