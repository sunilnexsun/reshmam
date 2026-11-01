import type { Metadata } from "next";
import OrderDetails from "@admin/orders/OrderDetails";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Order" };

export default function Page() {
  return <OrderDetails />;
}
