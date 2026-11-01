import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./admin.css";
import { AdminApp } from "./_components/AdminApp";

// The admin renders entirely in the browser (its data lives in localStorage), so there is no server-rendered
// shell for Next.js to make "instant". Opt out of that validation, which otherwise flags every admin route in dev.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "RESHMAM Admin", template: "%s · RESHMAM Admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/images/logo-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#064e3b",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <AdminApp>{children}</AdminApp>;
}
