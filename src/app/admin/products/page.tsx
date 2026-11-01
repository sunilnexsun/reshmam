import type { Metadata } from "next";
import ProductList from "./ProductList";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return <ProductList />;
}
