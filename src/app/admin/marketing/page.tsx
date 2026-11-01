import type { Metadata } from "next";
import Marketing from "./Marketing";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Marketing" };

export default function Page() {
  return <Marketing />;
}
