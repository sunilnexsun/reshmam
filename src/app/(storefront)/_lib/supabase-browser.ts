"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * The one Supabase client the browser uses (customer sign-in, saved cart and wishlist). Signed-in requests
 * carry the customer's session, and the database's row-level security limits them to the customer's own rows.
 * Returns null when Supabase isn't configured.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    client = url && anonKey ? createClient(url, anonKey) : null;
  }
  return client;
}
