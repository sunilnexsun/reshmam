import type { Metadata } from "next";
import PriceManagement from "./PriceManagement";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Price Management" };

export default function Page() {
  return <PriceManagement />;
}
