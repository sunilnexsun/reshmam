import Dashboard from "./Dashboard";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export default function Page() {
  return <Dashboard />;
}
