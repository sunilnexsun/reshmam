import type { Metadata } from "next";
import Marketing from "./Marketing";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Coupons" };

export default function Page() {
  return <Marketing />;
}
