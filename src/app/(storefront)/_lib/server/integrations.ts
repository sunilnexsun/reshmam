import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Integration status helpers. Each integration is optional — when its
 * credentials are missing the related feature reports "not configured"
 * instead of pretending to succeed.
 */

let adminClient: SupabaseClient | null = null;

/** Server-only Supabase client using the service-role key (never sent to the browser). */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!adminClient) {
    adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return adminClient;
}

export const razorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? null };
};

export function integrationStatus() {
  return {
    database: Boolean(getSupabaseAdmin()),
    payments: Boolean(razorpayConfig()),
    email: Boolean(process.env.RESEND_API_KEY && process.env.ENQUIRY_FROM_EMAIL),
  };
}

/** Sends a notification email through Resend's HTTP API when configured. */
export async function sendEmail(opts: { to: string; subject: string; text: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false as const, reason: "not-configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      reply_to: opts.replyTo,
    }),
  });
  if (!res.ok) {
    console.error("Email delivery failed", res.status, await res.text().catch(() => ""));
    return { sent: false as const, reason: "failed" };
  }
  return { sent: true as const };
}

/* ---------------- Simple in-memory rate limiter ----------------
   Good enough for a single server instance. For multi-instance
   deployments use a shared store (e.g. Upstash Redis). */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
