import { NextResponse } from "next/server";
import { getDynamicCatalogue } from "@/lib/catalogue-data";

export async function GET() {
  try {
    const dynamic = await getDynamicCatalogue();
    if (dynamic) {
      return NextResponse.json({
        ok: true,
        source: "firestore",
        products: dynamic.products,
        categories: dynamic.categories,
        branches: dynamic.branches,
      });
    }
  } catch (err) {
    console.error("API /api/products error:", err);
  }

  return NextResponse.json({
    ok: true,
    source: "firestore",
    products: [],
    categories: [],
    branches: [],
  });
}
