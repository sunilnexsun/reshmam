import type { Metadata } from "next";
import Settings from "./Settings";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <Settings />;
}
