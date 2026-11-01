import type { Metadata } from "next";
import CustomerDetails from "@admin/customers/CustomerDetails";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Customer" };

export default function Page() {
  return <CustomerDetails />;
}
