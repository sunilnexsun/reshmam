import type { Metadata } from "next";
import CustomerList from "./CustomerList";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return <CustomerList />;
}
