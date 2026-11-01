import type { Metadata } from "next";
import AIChatbot from "./AIChatbot";

// Rendered only in the browser (see admin/layout.tsx), so instant-navigation validation can't apply.
export const instant = false;

export const metadata: Metadata = { title: "AI Chatbot" };

export default function Page() {
  return <AIChatbot />;
}
