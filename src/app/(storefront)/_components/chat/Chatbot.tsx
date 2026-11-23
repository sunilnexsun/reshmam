"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { mountChatbot } from "./chatbot-core";
import { branchName } from "@storefront/_lib/products";
import { useDynamicCatalogue } from "@storefront/_lib/use-catalogue";
import { faqs } from "@storefront/_lib/faqs";
import { site } from "@storefront/_lib/site";
import { addToCart } from "@storefront/_components/products/ProductCard";

/** Mounts the Reshmam shopping assistant (floating chat button + panel). */
export function Chatbot() {
  const host = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  const { products, categories } = useDynamicCatalogue();

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (!host.current) return;
    const chatProducts = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      shortName: p.shortName,
      category: p.category,
      kind: p.kind,
      branchName: branchName(p.branch),
      image: p.image,
      imageAlt: p.imageAlt,
      summary: p.summary,
      description: p.description,
      uses: p.uses,
      notice: p.notice,
      variants: p.variants,
    }));

    const bot = mountChatbot(host.current, {
      products: chatProducts,
      categories,
      offers: site.offers,
      faqs,
      phone: site.phone,
      email: site.emails.info,
      whatsappNumber: site.whatsapp.number,
      asset: (path) => path,
      addToCart: (variantId, quantity) => {
        const product = products.find((p) => p.variants.some((v) => v.id === variantId));
        if (product) addToCart(product, variantId, quantity);
      },
      navigate: (href) => routerRef.current.push(href),
      lookupOrder: async (orderNumber, email) => {
        const res = await fetch("/api/orders/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, email }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.ok ? data.order : null;
      },
    });

    return () => bot.destroy();
  }, [products, categories]);

  return <div ref={host} />;
}
