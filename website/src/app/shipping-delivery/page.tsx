import type { Metadata } from "next";
import { PolicyPage } from "@/components/sections/HelpCenter";
import { site } from "@/lib/site";
import { formatINR } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: "How RESHMAM processes, ships and delivers orders, shipping charges and possible delivery delays.",
  alternates: { canonical: "/shipping-delivery" },
};

export default function Page() {
  return (
    <PolicyPage
      title="Shipping & Delivery Policy"
      href="/shipping-delivery"
      intro="At Reshmam, we are committed to delivering your orders safely and efficiently. We take care to ensure that every product is properly packed and dispatched to reach you in excellent condition."
    >
      <h2>Order Processing Time</h2>
      <ul>
        <li>Orders are processed after successful payment confirmation.</li>
        <li>Processing time may vary depending on product availability.</li>
        <li>Orders are generally dispatched within the estimated processing period communicated at checkout or order confirmation.</li>
      </ul>

      <h2>Shipping Locations</h2>
      <p>We aim to deliver our products across India, subject to courier service availability at the delivery location.</p>

      <h2>Estimated Delivery Time</h2>
      <ul>
        <li><strong>Local Delivery:</strong> As per serviceability and order confirmation.</li>
        <li><strong>Metro Cities:</strong> Estimated delivery based on courier availability.</li>
        <li><strong>Other Locations:</strong> Delivery timelines may vary depending on the destination.</li>
      </ul>
      <p>The estimated delivery date will be communicated through order confirmation or shipping updates.</p>

      <h2>Shipping Charges</h2>
      <ul>
        <li>Shipping charges, if applicable, will be displayed during checkout.</li>
        <li>
          Free shipping offers may be available during selected promotions. Currently, delivery is free across{" "}
          {site.shipping.homeState} on orders above {formatINR(site.shipping.freeThreshold)}.
        </li>
        <li>Additional charges may apply for specific locations or delivery requirements, where applicable.</li>
      </ul>

      <h2>Order Tracking</h2>
      <p>
        Once your order has been dispatched, you will receive tracking details through your registered mobile number or
        email address, where supported.
      </p>

      <h2>Delivery Delays</h2>
      <p>Delivery may occasionally be delayed due to:</p>
      <ul>
        <li>Weather conditions.</li>
        <li>Courier service disruptions.</li>
        <li>Public holidays.</li>
        <li>Remote delivery locations.</li>
        <li>Unexpected operational circumstances.</li>
      </ul>

      <h2>Incorrect Delivery Information</h2>
      <p>Please ensure that your shipping address, mobile number and PIN code are accurate before placing your order.</p>
      <p>
        For shipping-related assistance, contact our support team on <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>.
      </p>
    </PolicyPage>
  );
}
