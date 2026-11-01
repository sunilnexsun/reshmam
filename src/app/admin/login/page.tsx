import type { Metadata } from "next";
import Login from "./Login";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Login" };

export default function Page() {
  return <Login />;
}
