import type { Metadata } from "next";
import { PolicyPage } from "@storefront/_components/sections/HelpCenter";
import { site } from "@storefront/_lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Reshmam collects, uses, stores and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function Page() {
  return (
    <PolicyPage
      title="Privacy Policy"
      href="/privacy-policy"
      intro="Reshmam respects your privacy and is committed to protecting the personal information you share while using our website."
    >
      <p>
        This Privacy Policy explains how we collect, use, store and protect your information when you visit our website
        or make a purchase.
      </p>

      <h2>Information We Collect</h2>
      <p>We may collect the following information:</p>
      <h3>Personal Information</h3>
      <ul>
        <li>Full name.</li>
        <li>Mobile number.</li>
        <li>Email address.</li>
        <li>Billing address.</li>
        <li>Shipping address.</li>
      </ul>
      <h3>Order Information</h3>
      <ul>
        <li>Products purchased.</li>
        <li>Order history.</li>
        <li>Transaction reference details.</li>
        <li>Payment status.</li>
      </ul>
      <h3>Technical Information</h3>
      <ul>
        <li>IP address.</li>
        <li>Browser information.</li>
        <li>Device information.</li>
        <li>Website usage data.</li>
        <li>Cookies and browsing activity.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>Your information may be used to:</p>
      <ul>
        <li>Process and deliver orders.</li>
        <li>Provide order tracking updates.</li>
        <li>Communicate about purchases.</li>
        <li>Respond to customer enquiries.</li>
        <li>Improve website functionality.</li>
        <li>Send promotional updates, where permitted.</li>
        <li>Prevent fraudulent transactions.</li>
        <li>Meet applicable legal requirements.</li>
      </ul>

      <h2>Payment Security</h2>
      <p>Payments made through our website may be processed by authorized third-party payment gateway providers.</p>
      <p>Reshmam does not intend to store complete card details, UPI PINs or banking passwords on its servers.</p>

      <h2>Cookies</h2>
      <p>Our website may use cookies to:</p>
      <ul>
        <li>Improve browsing experience.</li>
        <li>Remember user preferences.</li>
        <li>Understand website traffic.</li>
        <li>Improve website performance.</li>
      </ul>
      <p>Users can manage cookies through their browser settings.</p>

      <h2>Information Sharing</h2>
      <p>We may share necessary information with:</p>
      <ul>
        <li>Courier and logistics partners.</li>
        <li>Payment gateway providers.</li>
        <li>Website hosting and technology service providers.</li>
        <li>Authorized service partners.</li>
        <li>Government or legal authorities when required by law.</li>
      </ul>
      <p>We do not sell customers&apos; personal information.</p>

      <h2>Data Security</h2>
      <p>
        We take reasonable technical and organizational measures to protect personal information against unauthorized
        access, misuse, alteration or disclosure.
      </p>

      <h2>Your Privacy Rights</h2>
      <p>
        You may contact us on <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a> to:
      </p>
      <ul>
        <li>Request access to your personal information.</li>
        <li>Correct inaccurate information.</li>
        <li>Request deletion, subject to applicable legal obligations.</li>
        <li>Withdraw consent where applicable.</li>
        <li>Raise privacy-related concerns.</li>
      </ul>

      <h2>Policy Updates</h2>
      <p>Reshmam may update this Privacy Policy from time to time. Changes will be published on this page.</p>

      <h2>Contact Information</h2>
      <p>
        For privacy-related questions, please contact the Reshmam support team on <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>.
      </p>
    </PolicyPage>
  );
}
