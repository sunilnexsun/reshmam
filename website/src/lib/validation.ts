import { z } from "zod";

export const enquirySubjects = [
  { value: "general", label: "General Enquiry" },
  { value: "product", label: "Product Enquiry" },
  { value: "order-support", label: "Order Support" },
  { value: "bulk-orders", label: "Bulk Orders" },
  { value: "retail-partnership", label: "Retail Partnership" },
  { value: "other", label: "Other" },
] as const;

export type EnquirySubject = (typeof enquirySubjects)[number]["value"];
export const isBulkSubject = (s: string) => s === "bulk-orders" || s === "retail-partnership";

const phoneRegex = /^[+]?[\d\s-]{7,16}$/;

export const enquirySchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name.").max(100),
    email: z.string().trim().email("Please enter a valid email address.").max(200),
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .refine((v) => !v || phoneRegex.test(v), "Please enter a valid phone number."),
    subject: z.enum(enquirySubjects.map((s) => s.value) as [EnquirySubject, ...EnquirySubject[]], {
      message: "Please choose a subject.",
    }),
    message: z.string().trim().min(10, "Please write at least 10 characters.").max(4000),
    businessName: z.string().trim().max(150).optional(),
    quantity: z.string().trim().max(150).optional(),
    // anti-spam fields
    website: z.string().max(0).optional(), // honeypot – must stay empty
    startedAt: z.number().optional(),
  });

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const indianStates = [
  "Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Please enter your full name.").max(100),
    email: z.string().trim().email("Please enter a valid email address."),
    phone: z.string().trim().regex(/^[+]?[\d\s-]{10,16}$/, "Please enter a valid mobile number."),
  }),
  address: z.object({
    line1: z.string().trim().min(3, "Please enter your address.").max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2, "Please enter your city.").max(100),
    state: z.enum(indianStates, { message: "Please choose your state." }),
    pincode: z.string().trim().regex(/^\d{6}$/, "Please enter a 6-digit PIN code."),
  }),
  paymentMethod: z.enum(["online", "cod"]),
  items: z
    .array(z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(50) }))
    .min(1, "Your cart is empty.")
    .max(30),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
