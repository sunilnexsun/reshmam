import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, Cog, Leaf, Truck } from "lucide-react";
import { ProductPurchase } from "@storefront/_components/products/ProductPurchase";
import { ProductImage, SelectedVariantProvider } from "@storefront/_components/products/SelectedVariant";
import { BranchBadge } from "@storefront/_components/products/ProductCard";
import { ProductGrid } from "@storefront/_components/products/ProductCatalog";
import { Breadcrumbs, JsonLd } from "@storefront/_components/sections/Misc";
import {
  Container,
  IconBadge,
  SectionHeading,
} from "@storefront/_components/ui/primitives";
import { getCategory, getProduct, products as fallbackProducts } from "@storefront/_lib/products";
import { applyLiveToProduct } from "@storefront/_lib/live";
import {
  getLiveVariants,
  fetchDynamicProductBySlug,
  fetchDynamicProducts,
  fetchDynamicCategories,
} from "@storefront/_lib/server/catalogue";
import { absoluteUrl, openGraphBase, site } from "@storefront/_lib/site";
import { formatINR } from "@storefront/_lib/pricing";

export async function generateStaticParams() {
  const dynamic = await fetchDynamicProducts();
  return dynamic.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = (await fetchDynamicProductBySlug(slug)) || getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.summary} ${product.edible ? "" : "For external use only. "}Available in ${product.variants
      .map((v) => v.label)
      .join(", ")}.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { ...openGraphBase, type: "website", url: `/products/${product.slug}`, images: [product.image] },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const catalogueProduct = (await fetchDynamicProductBySlug(slug)) || getProduct(slug);
  if (!catalogueProduct) notFound();

  // Stock and prices from Firestore
  const product = applyLiveToProduct(catalogueProduct, await getLiveVariants());
  const categories = await fetchDynamicCategories();
  const category = categories.find((c) => c.slug === product.category) || getCategory(product.category);

  const allProducts = await fetchDynamicProducts();
  const related = allProducts
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, 4);
  const fill = allProducts.filter(
    (p) => p.slug !== product.slug && !related.includes(p),
  );
  const more = [...related, ...fill].slice(0, 4);

  // Structured data
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: absoluteUrl(product.image),
    description: product.summary,
    brand: {
      "@type": "Brand",
      name: (product as any).brand || "RESHMAM",
    },
    category: category?.name,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.id,
      name: `${product.name} – ${v.label}`,
      price: v.price,
      priceCurrency: "INR",
      availability:
        v.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/products/${product.slug}`),
    })),
  };

  return (
    <>
      <section className="bg-paper py-8 sm:py-12">
        <Container>
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { href: "/products", label: "Products" },
              ...(category && product.kind !== "combo"
                ? [
                    {
                      href: `/products?category=${category.slug}`,
                      label: category.shortName,
                    },
                  ]
                : []),
              { label: product.shortName },
            ]}
          />
          <SelectedVariantProvider product={product}>
            <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
              <div className="overflow-hidden rounded-2xl border border-beige-300/80 bg-white shadow-card">
                <ProductImage product={product} />
              </div>
              <div>
                {category && (
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-rust">
                    {product.kind === "combo" ? "Gift Pack" : category.shortName}
                  </p>
                )}
                <BranchBadge branch={product.branch} className="mt-3" />
                <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-forest-800 sm:text-4xl">
                  {product.name}
                </h1>
                <p className="mt-3 text-lg text-ink-soft">{product.summary}</p>
                {product.notice && (
                  <p
                    role="note"
                    className="mt-4 flex items-start gap-2 rounded-lg border border-rust/30 bg-rust/10 p-3 text-sm font-medium text-rust"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden
                    />
                    {product.notice}
                  </p>
                )}
                <div className="mt-6">
                  <ProductPurchase product={product} />
                </div>
                <ul className="mt-8 grid gap-3 border-t border-beige-300 pt-6 text-sm sm:grid-cols-3">
                  <li className="flex items-center gap-2">
                    <IconBadge size="sm">
                      <Cog className="h-4 w-4" />
                    </IconBadge>{" "}
                    Traditional extraction
                  </li>
                  <li className="flex items-center gap-2">
                    <IconBadge size="sm">
                      <Leaf className="h-4 w-4" />
                    </IconBadge>{" "}
                    No chemical solvents
                  </li>
                  <li className="flex items-center gap-2">
                    <IconBadge size="sm">
                      <Truck className="h-4 w-4" />
                    </IconBadge>{" "}
                    Free TN delivery over {formatINR(site.shipping.freeThreshold)}
                  </li>
                </ul>
              </div>
            </div>
          </SelectedVariantProvider>

          <div className="mt-12 grid gap-8 rounded-2xl border border-beige-300/80 bg-white p-6 sm:p-8 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl font-bold text-forest-800">
                About this product
              </h2>
              <div className="prose-reshmam mt-3 text-ink-soft">
                {product.description.map((d) => (
                  <p key={d}>{d}</p>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-forest-800">
                Common uses
              </h2>
              <ul className="prose-reshmam mt-3 text-ink-soft">
                {product.uses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <h3 className="mt-4 font-sans text-sm font-semibold text-forest-900">
                Available sizes
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {product.variants.map((v) => (
                  <li key={v.id} className="rounded-md bg-beige px-3 py-1.5">
                    {v.label} · {formatINR(v.price)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="more-heading" className="bg-cream pb-16 pt-4">
        <Container>
          <SectionHeading
            title={<span id="more-heading">You May Also Like</span>}
          />
          <div className="mt-8">
            <ProductGrid products={more} />
          </div>
        </Container>
      </section>
      <JsonLd data={ld} />
    </>
  );
}
