import type { Metadata } from "next";
import NotFound from "@admin/_components/NotFound";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Page not found" };

export default function Page() {
  return <NotFound />;
}
