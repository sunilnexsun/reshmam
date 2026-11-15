"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  branches,
  categories,
  productsInCategory,
  searchProducts,
  type BranchSlug,
  type CategorySlug,
} from "@storefront/_lib/products";
import { ProductCard } from "./ProductCard";
import { cn } from "@storefront/_components/ui/primitives";

type Filter = CategorySlug | "all";

export function ProductGrid({
  products,
}: {
  products: ReturnType<typeof productsInCategory>;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.slug}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

export function CategoryFilter({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
}) {
  const options: { value: Filter; label: string }[] = [
    { value: "all", label: "All Products" },
    ...categories.map((c) => ({ value: c.slug, label: c.shortName })),
  ];
  return (
    <div
      role="group"
      aria-label="Filter products by category"
      className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max justify-center gap-2.5 sm:min-w-0 sm:flex-wrap">
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              aria-pressed={value === o.value}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-11 rounded-md border px-5 text-sm font-medium transition-colors sm:min-w-32",
                value === o.value
                  ? "border-forest-800 bg-forest-800 text-white shadow-sm"
                  : "border-beige-300 bg-beige/70 text-ink hover:border-forest-800 hover:text-forest-800",
              )}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type BranchFilter = BranchSlug | "all";

export function BranchFilterBar({
  value,
  onChange,
}: {
  value: BranchFilter;
  onChange: (b: BranchFilter) => void;
}) {
  const options: { value: BranchFilter; label: string }[] = [
    { value: "all", label: "All Branches" },
    ...branches.map((b) => ({ value: b.slug, label: b.name })),
  ];
  return (
    <div
      role="group"
      aria-label="Filter products by branch"
      className="mb-4 flex flex-wrap justify-center gap-2"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-10 rounded-full border px-5 text-xs font-bold uppercase tracking-wider transition-colors",
            value === o.value
              ? "border-forest-800 bg-forest-800 text-white"
              : "border-beige-300 bg-white text-ink-soft hover:border-forest-800 hover:text-forest-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Reads ?branch=, ?category= and ?q= from the URL and filters client-side without a page reload. */
export function ProductCatalog() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("category");
  const filter: Filter = categories.some((c) => c.slug === raw)
    ? (raw as CategorySlug)
    : "all";
  const rawBranch = params.get("branch");
  const branch: BranchFilter = branches.some((b) => b.slug === rawBranch)
    ? (rawBranch as BranchSlug)
    : "all";
  const q = params.get("q")?.trim() ?? "";

  const list = q ? searchProducts(q) : productsInCategory(filter, branch);

  const update = (f: Filter, b: BranchFilter) => {
    const next = new URLSearchParams();
    if (b !== "all") next.set("branch", b);
    if (f !== "all") next.set("category", f);
    router.replace(next.size ? `${pathname}?${next}` : pathname, {
      scroll: false,
    });
  };
  const setFilter = (f: Filter) => update(f, branch);

  return (
    <div>
      {/* Only worth showing when products are sold under more than one branch. */}
      {branches.length > 1 && (
        <BranchFilterBar
          value={q ? "all" : branch}
          onChange={(b) => update(filter, b)}
        />
      )}
      <CategoryFilter value={q ? "all" : filter} onChange={setFilter} />
      <div className="mt-6 flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
        <p aria-live="polite">
          {q ? (
            <>
              {list.length} {list.length === 1 ? "result" : "results"} for “
              <strong className="text-ink">{q}</strong>”
            </>
          ) : (
            <>
              Showing {list.length} {list.length === 1 ? "product" : "products"}
            </>
          )}
        </p>
        {q && (
          <Link
            href="/products"
            className="font-semibold text-forest-800 underline underline-offset-4"
          >
            Clear search
          </Link>
        )}
      </div>
      <div className="mt-4">
        {list.length ? (
          <ProductGrid products={list} />
        ) : (
          <div className="rounded-xl border border-dashed border-beige-300 bg-white/60 p-10 text-center">
            <p className="font-serif text-xl text-forest-800">
              No products found
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Try a different search term or browse all products.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-block font-semibold text-forest-800 underline"
            >
              View all products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** Server-renderable fallback for the Suspense boundary (no URL params yet). */
export function ProductCatalogFallback() {
  return (
    <div>
      <CategoryFilterStatic />
      <div className="mt-10">
        <ProductGrid products={productsInCategory("all")} />
      </div>
    </div>
  );
}

function CategoryFilterStatic() {
  return (
    <div data-static-filters>
      <ul className="mb-4 flex flex-wrap justify-center gap-2" aria-hidden>
        {["All Branches", ...branches.map((b) => b.name)].map((l, i) => (
          <li
            key={l}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full border px-5 text-xs font-bold uppercase tracking-wider",
              i === 0
                ? "border-forest-800 bg-forest-800 text-white"
                : "border-beige-300 bg-white text-ink-soft",
            )}
          >
            {l}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap justify-center gap-2.5" aria-hidden>
        {["All Products", ...categories.map((c) => c.shortName)].map((l, i) => (
          <li
            key={l}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md border px-5 text-sm font-medium sm:min-w-32 sm:justify-center",
              i === 0
                ? "border-forest-800 bg-forest-800 text-white"
                : "border-beige-300 bg-beige/70",
            )}
          >
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
