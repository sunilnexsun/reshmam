import type { Metadata } from "next";
import WhatsAppAutomation from "./WhatsAppAutomation";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "WhatsApp Automation" };

export default function Page() {
  return <WhatsAppAutomation />;
}
