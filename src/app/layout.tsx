/**
 * Bare document shell. The storefront chrome lives in app/(storefront)/layout.tsx and the
 * admin panel in app/admin/layout.tsx, so each part loads only its own styles.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
