import { NextResponse } from "next/server";
import { getLiveVariants } from "@storefront/_lib/server/catalogue";

/** Live stock and prices for the product pages and cart; `variants` is null until Supabase is set up. */
export async function GET() {
  return NextResponse.json({ variants: await getLiveVariants() });
}
