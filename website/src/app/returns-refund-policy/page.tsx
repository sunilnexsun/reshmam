import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/sections/HelpCenter";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns & Refund Policy",
  description: "Return eligibility, conditions, refunds and replacements for RESHMAM orders.",
  alternates: { canonical: "/returns-refund-policy" },
};

export default function Page() {
  return (
    <PolicyPage
      title="Returns & Refund Policy"
      href="/returns-refund-policy"
      intro="At Reshmam, customer satisfaction is important to us. We want every customer to have a smooth and reliable shopping experience."
    >
      <p>
        If you receive a damaged, defective or incorrect product, please contact our customer support team for
        assistance.
      </p>

      <h2>Return Eligibility</h2>
      <p>A product may be eligible for return or replacement if:</p>
      <ul>
        <li>You received a damaged product.</li>
        <li>You received a defective product.</li>
        <li>You received an incorrect item.</li>
        <li>The product received is significantly different from its description.</li>
      </ul>
      <p>All return requests are subject to verification and approval under our return policy.</p>

      <h2>Conditions for Returns</h2>
      <p>To request a return:</p>
      <ul>
        <li>The product should be unused.</li>
        <li>Original packaging should be retained.</li>
        <li>All tags, accessories and included items should be available.</li>
        <li>Proof of purchase or order details must be provided.</li>
        <li>The issue should be reported within the applicable return period.</li>
      </ul>

      <h2>Non-Returnable Products</h2>
      <p>The following products may not be eligible for return unless damaged, defective or incorrectly supplied:</p>
      <ul>
        <li>Products marked as non-returnable.</li>
        <li>Used or altered products.</li>
        <li>Products damaged due to customer misuse.</li>
        <li>Products returned without original packaging, where required.</li>
      </ul>

      <h2>How to Request a Return</h2>
      <ol>
        <li>
          Contact our customer support team on <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>.
        </li>
        <li>Share your Order ID.</li>
        <li>Explain the reason for the return.</li>
        <li>Attach clear photographs or videos if the product is damaged or incorrect.</li>
        <li>Wait for return approval and further instructions.</li>
      </ol>

      <h2>Refund Process</h2>
      <p>Once the returned product is received and inspected:</p>
      <ul>
        <li>Our team will verify the product condition.</li>
        <li>Approved refunds will be initiated through the applicable payment method.</li>
        <li>Refund processing time may vary depending on the payment provider or bank.</li>
      </ul>

      <h2>Replacement Policy</h2>
      <p>
        If an eligible product is damaged, defective or incorrectly delivered, Reshmam may arrange a replacement, subject
        to product availability and approval.
      </p>

      <h2>Cancellation Policy</h2>
      <p>
        Orders may be eligible for cancellation before dispatch. Once an order has been shipped, cancellation may not be
        possible. See our <Link href="/cancellation-policy">Cancellation Policy</Link> for details.
      </p>
      <p>
        For any return, refund or cancellation-related queries, please contact our customer support team on{" "}
        <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>.
      </p>
    </PolicyPage>
  );
}
