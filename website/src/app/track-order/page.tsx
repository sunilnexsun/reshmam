import type { Metadata } from "next";
import { HelpCenterLayout } from "@/components/sections/HelpCenter";
import { SupportBox } from "@/components/sections/PageBanner";
import { trackingSteps } from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Track your Reshmam order from confirmation to delivery with your Order ID.",
  alternates: { canonical: "/track-order" },
};

export default function TrackOrderPage() {
  return (
    <HelpCenterLayout
      current="/track-order"
      title="Track Your Order"
      intro="Thank you for shopping with Reshmam! We understand that you are excited to receive your order. Our order tracking facility helps you stay updated on your purchase, from order confirmation to final delivery."
    >
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-beige-300/80 bg-white p-6">
            <h2 className="font-serif text-2xl font-bold text-forest-800">How to Track Your Order</h2>
            <p className="mt-2 text-sm text-ink-soft">You can track your order by following these simple steps:</p>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Visit the Track Order page on our website.",
                "Enter your Order ID or Tracking Number.",
                "Enter your registered mobile number or email address, if required.",
                "Click on the Track Order button.",
                "View the latest status of your shipment.",
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-800 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-beige-300/80 bg-white p-6">
            <h2 className="font-serif text-2xl font-bold text-forest-800">Order Status Information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {trackingSteps.map((s) => (
                <div key={s.key}>
                  <dt className="font-semibold text-forest-900">{s.label}</dt>
                  <dd className="text-ink-soft">{s.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="rounded-2xl border border-beige-300/80 bg-white p-6">
          <h2 className="font-serif text-2xl font-bold text-forest-800">Need Help With Your Order?</h2>
          <p className="mt-2 text-ink-soft">
            If you experience any issues with tracking your order, please contact our customer support team with your
            Order ID.
          </p>
        </div>
        <SupportBox />
      </div>
    </HelpCenterLayout>
  );
}
