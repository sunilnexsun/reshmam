import { connection } from "next/server";
import { integrationStatus } from "@/lib/server/integrations";

/** Tells the checkout page which integrations are live, so it never pretends a feature works. */
export async function GET() {
  await connection();
  const s = integrationStatus();
  return Response.json({ ordering: s.database, onlinePayments: s.database && s.payments });
}
