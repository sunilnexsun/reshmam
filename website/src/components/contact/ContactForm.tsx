"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { enquirySchema, enquirySubjects, fieldErrors, isBulkSubject, type EnquirySubject } from "@/lib/validation";
import { site } from "@/lib/site";
import { cn } from "../ui/primitives";

const inputCls =
  "mt-1.5 block w-full rounded-md border bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20";

function Field({
  id,
  label,
  required,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-red-700" aria-hidden>
            {" "}*
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "success" } | { kind: "error"; message: string };

export function ContactForm({ initialSubject = "general" }: { initialSubject?: EnquirySubject }) {
  const [subject, setSubject] = useState<string>(initialSubject);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const formRef = useRef<HTMLFormElement>(null);
  const bulk = isBulkSubject(subject);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? "") || undefined,
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
      businessName: bulk ? String(fd.get("businessName") ?? "") || undefined : undefined,
      quantity: bulk ? String(fd.get("quantity") ?? "") || undefined : undefined,
      website: String(fd.get("website") ?? ""),
      startedAt: startedAt.current,
    };
    const parsed = enquirySchema.safeParse(raw);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      const first = Object.keys(errs)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string> };
      if (res.ok && data.ok) {
        setStatus({ kind: "success" });
        formRef.current?.reset();
        setSubject("general");
      } else {
        if (data.fields) setErrors(data.fields);
        setStatus({ kind: "error", message: data.error ?? "Something went wrong. Please try again." });
      }
    } catch {
      setStatus({ kind: "error", message: "We couldn't reach the server. Please check your connection and try again." });
    }
  }

  const describe = (id: string) => (errors[id] ? `${id}-error` : undefined);

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="relative space-y-4" aria-describedby="form-status">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Your Name" required error={errors.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="Enter your name"
            aria-invalid={!!errors.name}
            aria-describedby={describe("name")}
            className={cn(inputCls, errors.name ? "border-red-600" : "border-beige-300")}
          />
        </Field>
        <Field id="email" label="Your Email" required error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email"
            aria-invalid={!!errors.email}
            aria-describedby={describe("email")}
            className={cn(inputCls, errors.email ? "border-red-600" : "border-beige-300")}
          />
        </Field>
        <Field id="phone" label="Phone Number" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Enter your phone number"
            aria-invalid={!!errors.phone}
            aria-describedby={describe("phone")}
            className={cn(inputCls, errors.phone ? "border-red-600" : "border-beige-300")}
          />
        </Field>
        <Field id="subject" label="Subject" error={errors.subject}>
          <select
            id="subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={!!errors.subject}
            aria-describedby={describe("subject")}
            className={cn(inputCls, "appearance-auto", errors.subject ? "border-red-600" : "border-beige-300")}
          >
            {enquirySubjects.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        {bulk && (
          <>
            <Field id="businessName" label="Business Name" error={errors.businessName}>
              <input
                id="businessName"
                name="businessName"
                autoComplete="organization"
                placeholder="Shop or company name (optional)"
                className={cn(inputCls, "border-beige-300")}
              />
            </Field>
            <Field id="quantity" label="Estimated Quantity" error={errors.quantity}>
              <input
                id="quantity"
                name="quantity"
                placeholder="e.g. 100 L per month (optional)"
                className={cn(inputCls, "border-beige-300")}
              />
            </Field>
          </>
        )}
      </div>
      <Field id="message" label="Your Message" required error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          placeholder="Type your message here..."
          aria-invalid={!!errors.message}
          aria-describedby={describe("message")}
          className={cn(inputCls, "resize-y", errors.message ? "border-red-600" : "border-beige-300")}
        />
      </Field>
      {/* Honeypot – hidden from people, attractive to bots */}
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div id="form-status" aria-live="polite">
        {status.kind === "success" && (
          <p className="flex items-start gap-2 rounded-md border border-leaf-600/40 bg-leaf-100 p-3 text-sm text-forest-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Thank you! Your enquiry has been received. {site.responseTimeCopy}
          </p>
        )}
        {status.kind === "error" && (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {status.message} You can also call us on{" "}
              <a className="font-semibold underline" href={`tel:${site.phone.tel}`}>
                {site.phone.display}
              </a>{" "}
              or email{" "}
              <a className="font-semibold underline" href={`mailto:${site.emails.info}`}>
                {site.emails.info}
              </a>
              .
            </span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-forest-800 px-7 text-sm font-semibold text-white hover:bg-forest-950 disabled:opacity-60"
      >
        {status.kind === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          <>
            Send Message <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}

/** Pre-selects the subject from ?subject= (e.g. from the Bulk Orders button). */
export function ContactFormFromUrl() {
  const params = useSearchParams();
  const s = params.get("subject");
  const subject = enquirySubjects.some((x) => x.value === s) ? (s as EnquirySubject) : "general";
  return <ContactForm key={subject} initialSubject={subject} />;
}
