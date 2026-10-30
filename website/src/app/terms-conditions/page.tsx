import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/sections/HelpCenter";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms that apply when you use the Reshmam website and place orders.",
  alternates: { canonical: "/terms-conditions" },
};

export default function Page() {
  return (
    <PolicyPage
      title="Terms & Conditions"
      href="/terms-conditions"
      intro="Welcome to Reshmam. By accessing or using our website, you agree to comply with the following Terms & Conditions."
    >
      <p>Please read these terms carefully before placing an order.</p>

      <h2>Website Usage</h2>
      <ul>
        <li>Users must provide accurate information while creating an account or placing an order.</li>
        <li>Users must not misuse the website or attempt unauthorized access.</li>
        <li>All website content is intended for lawful personal and commercial use as permitted by Reshmam.</li>
      </ul>

      <h2>Product Information</h2>
      <p>We make reasonable efforts to display accurate product descriptions, images, colours and pricing.</p>
      <p>However:</p>
      <ul>
        <li>Actual product colours may vary slightly due to screen settings.</li>
        <li>Product availability may change without prior notice.</li>
        <li>Product specifications may be updated where necessary.</li>
        <li>Images are provided for product representation.</li>
      </ul>

      <h2>Pricing &amp; Payments</h2>
      <ul>
        <li>All prices will be displayed in Indian Rupees (INR), unless stated otherwise.</li>
        <li>Applicable taxes and shipping charges will be displayed during checkout.</li>
        <li>Orders are subject to successful payment confirmation.</li>
        <li>Reshmam reserves the right to correct pricing or listing errors.</li>
      </ul>

      <h2>Order Confirmation</h2>
      <p>
        After placing an order, customers may receive an order confirmation through email, SMS or WhatsApp, depending on
        the available communication services.
      </p>
      <p>
        Reshmam reserves the right to cancel orders in cases of suspected fraud, incorrect pricing or product
        unavailability, subject to applicable law.
      </p>

      <h2>Shipping &amp; Delivery</h2>
      <p>
        Delivery timelines are estimates and may vary based on location, courier availability and operational
        conditions.
      </p>
      <p>
        Please refer to our <Link href="/shipping-delivery">Shipping &amp; Delivery Policy</Link> for additional
        information.
      </p>

      <h2>Returns &amp; Refunds</h2>
      <p>
        All returns, replacements, refunds and cancellations are governed by our{" "}
        <Link href="/returns-refund-policy">Returns &amp; Refund Policy</Link>.
      </p>

      <h2>Intellectual Property</h2>
      <p>All website content, including:</p>
      <ul>
        <li>Logos and brand identity.</li>
        <li>Product photographs.</li>
        <li>Graphics and illustrations.</li>
        <li>Website designs.</li>
        <li>Text and other creative materials.</li>
      </ul>
      <p>are owned by or licensed to Reshmam and may not be copied or used without permission.</p>

      <h2>Limitation of Liability</h2>
      <p>
        Reshmam will not be responsible for indirect losses arising from temporary website interruptions, third-party
        service failures or circumstances beyond reasonable control, to the extent permitted by applicable law.
      </p>

      <h2>Governing Law</h2>
      <p>
        These Terms &amp; Conditions shall be governed by the applicable laws of India. Any disputes shall be subject to
        the jurisdiction of the competent courts.
      </p>

      <h2>Contact Information</h2>
      <p>
        For questions regarding these Terms &amp; Conditions, please contact the Reshmam support team on{" "}
        <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>.
      </p>
    </PolicyPage>
  );
}
