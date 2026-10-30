import { NextResponse } from "next/server";
import { enquirySchema, enquirySubjects, fieldErrors, isBulkSubject } from "@/lib/validation";
import { clientIp, getSupabaseAdmin, rateLimit, sendEmail } from "@/lib/server/integrations";

export async function POST(req: Request) {
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many enquiries. Please wait a few minutes and try again." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Spam heuristics: honeypot filled or form submitted implausibly fast.
  // Respond as if accepted so bots learn nothing, but store/send nothing.
  const tooFast = data.startedAt && Date.now() - data.startedAt < 2500;
  if (data.website || tooFast) {
    return NextResponse.json({ ok: true });
  }

  const db = getSupabaseAdmin();
  let stored = false;
  if (db) {
    const bulk = isBulkSubject(data.subject);
    const { error } = bulk
      ? await db.from("bulk_enquiries").insert({
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          enquiry_type: data.subject,
          business_name: data.businessName ?? null,
          estimated_quantity: data.quantity ?? null,
          message: data.message,
        })
      : await db.from("contact_enquiries").insert({
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          subject: data.subject,
          message: data.message,
        });
    if (error) console.error("Failed to store enquiry", error);
    else stored = true;
  }

  const subjectLabel = enquirySubjects.find((s) => s.value === data.subject)?.label ?? data.subject;
  const to = process.env.ENQUIRY_TO_EMAIL;
  const email = to
    ? await sendEmail({
        to,
        replyTo: data.email,
        subject: `[RESHMAM] ${subjectLabel} from ${data.name}`,
        text: [
          `Name: ${data.name}`,
          `Email: ${data.email}`,
          `Phone: ${data.phone ?? "-"}`,
          `Subject: ${subjectLabel}`,
          data.businessName ? `Business: ${data.businessName}` : "",
          data.quantity ? `Estimated quantity: ${data.quantity}` : "",
          "",
          data.message,
        ]
          .filter(Boolean)
          .join("\n"),
      })
    : { sent: false as const, reason: "not-configured" };

  if (!stored && !email.sent) {
    const notConfigured = !db && email.reason === "not-configured";
    return NextResponse.json(
      {
        ok: false,
        error: notConfigured
          ? "Online enquiries are not connected yet, so your message was not sent."
          : "We couldn't send your message right now.",
      },
      { status: notConfigured ? 503 : 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
