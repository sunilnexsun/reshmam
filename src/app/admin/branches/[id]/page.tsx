import type { Metadata } from "next";
import BranchDetails from "@admin/branches/BranchDetails";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "Branch" };

export default function Page() {
  return <BranchDetails />;
}
