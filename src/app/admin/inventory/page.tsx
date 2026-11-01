import type { Metadata } from "next";
import Inventory from "./Inventory";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return <Inventory />;
}
