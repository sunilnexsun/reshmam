import type { Metadata } from "next";
import ProductForm from "@admin/products/ProductForm";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Add Product" };

export default function Page() {
  return <ProductForm />;
}
