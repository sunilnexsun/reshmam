import type { Metadata } from "next";
import OrderList from "./OrderList";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrderList />;
}
