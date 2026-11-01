import type { Metadata } from "next";
import Reports from "./Reports";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return <Reports />;
}
