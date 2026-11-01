import type { Metadata } from "next";
import BranchList from "./BranchList";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Branches" };

export default function Page() {
  return <BranchList />;
}
