"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  categories as staticCategories,
  products as staticProducts,
  type BranchSlug,
  type CategorySlug,
  type Product,
  type Category,
  type Branch,
} from "@storefront/_lib/products";
import { ProductCard } from "./ProductCard";
import { cn } from "@storefront/_components/ui/primitives";

type Filter = CategorySlug | "all";
type BranchFilter = BranchSlug | "all";

export function ProductGrid({
  products,
}: {
  products: Product[];
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
  categoriesList = staticCategories,
  onChange,
}: {
  value: Filter;
  categoriesList?: Category[];
  onChange: (f: Filter) => void;
}) {
  const options: { value: Filter; label: string }[] = [
    { value: "all", label: "All Products" },
    ...categoriesList.map((c) => ({ value: c.slug, label: c.shortName || c.name })),
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

export function BranchFilterBar({
  value,
  branchesList = [],
  onChange,
}: {
  value: BranchFilter;
  branchesList?: Branch[];
  onChange: (b: BranchFilter) => void;
}) {
  const options: { value: BranchFilter; label: string }[] = [
    { value: "all", label: "All Branches" },
    ...branchesList.map((b) => ({ value: b.slug, label: b.name })),
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
export function ProductCatalog({
  initialProducts,
  initialCategories,
  initialBranches,
}: {
  initialProducts?: Product[];
  initialCategories?: Category[];
  initialBranches?: Branch[];
} = {}) {
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts || staticProducts);
  const [allCategories, setAllCategories] = useState<Category[]>(initialCategories || staticCategories);
  const [allBranches, setAllBranches] = useState<Branch[]>(initialBranches || []);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && Array.isArray(d.products) && d.products.length > 0) {
          setAllProducts(d.products);
        }
        if (d?.ok && Array.isArray(d.categories) && d.categories.length > 0) {
          setAllCategories(d.categories);
        }
        if (d?.ok && Array.isArray(d.branches) && d.branches.length > 0) {
          setAllBranches(d.branches);
        }
      })
      .catch(() => {});
  }, []);

  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("category");
  const filter: Filter = allCategories.some((c) => c.slug === raw)
    ? (raw as CategorySlug)
    : "all";
  const rawBranch = params.get("branch");
  const branch: BranchFilter = allBranches.some((b) => b.slug === rawBranch)
    ? (rawBranch as BranchSlug)
    : "all";
  const q = params.get("q")?.trim() ?? "";

  const list = q
    ? allProducts.filter((p) =>
        [p.name, p.shortName, p.summary, p.category, (p as any).brand || ""].join(" ").toLowerCase().includes(q.toLowerCase())
      )
    : allProducts.filter(
        (p) =>
          (branch === "all" || p.branch === branch) &&
          (filter === "all" || (p.category === filter && p.kind !== "combo"))
      );

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
      {allBranches.length > 1 && (
        <BranchFilterBar
          branchesList={allBranches}
          value={q ? "all" : branch}
          onChange={(b) => update(filter, b)}
        />
      )}
      <CategoryFilter value={q ? "all" : filter} categoriesList={allCategories} onChange={setFilter} />
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

/** Server-renderable fallback for the Suspense boundary. */
export function ProductCatalogFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-80 rounded-xl bg-beige-200/50 border border-beige-300/40" />
      ))}
    </div>
  );
}
