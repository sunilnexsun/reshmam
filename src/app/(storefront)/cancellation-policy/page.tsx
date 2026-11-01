import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@storefront/_components/sections/HelpCenter";
import { site } from "@storefront/_lib/site";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "When and how RESHMAM orders can be cancelled.",
  alternates: { canonical: "/cancellation-policy" },
};

export default function Page() {
  return (
    <PolicyPage
      title="Cancellation Policy"
      href="/cancellation-policy"
      intro="We understand that plans can change. This page explains when an order can be cancelled."
    >
      <h2>Cancelling an Order</h2>
      <p>
        Orders may be eligible for cancellation before dispatch. Once an order has been shipped, cancellation may not be
        possible.
      </p>

      <h2>How to Request a Cancellation</h2>
      <ol>
        <li>
          Contact our customer support team as soon as possible on <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>.
        </li>
        <li>Share your Order ID.</li>
        <li>Let us know that you would like to cancel the order.</li>
      </ol>
      <p>Our team will check the order status and confirm whether the cancellation can be made.</p>

      <h2>Refunds for Cancelled Orders</h2>
      <p>
        Refunds for approved cancellations are handled under our{" "}
        <Link href="/returns-refund-policy">Returns &amp; Refund Policy</Link>. Refund processing time may vary depending
        on the payment provider or bank.
      </p>

      <h2>Cancellation by Reshmam</h2>
      <p>
        Reshmam reserves the right to cancel orders in cases of suspected fraud, incorrect pricing or product
        unavailability, subject to applicable law.
      </p>

      <p>
        For any cancellation-related queries, please contact our customer support team on <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>.
      </p>
    </PolicyPage>
  );
}
