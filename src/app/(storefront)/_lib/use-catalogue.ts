"use client";

import { useEffect, useState } from "react";
import type { Product, Category, Branch } from "./products";

let cachedProducts: Product[] = [];
let cachedCategories: Category[] = [];
let cachedBranches: Branch[] = [];
let pendingPromise: Promise<{ products: Product[]; categories: Category[]; branches: Branch[] }> | null = null;

export function fetchClientCatalogue() {
  if (cachedProducts.length > 0) {
    return Promise.resolve({ products: cachedProducts, categories: cachedCategories, branches: cachedBranches });
  }
  if (!pendingPromise) {
    pendingPromise = fetch("/api/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && Array.isArray(d.products)) {
          cachedProducts = d.products;
          cachedCategories = d.categories || [];
          cachedBranches = d.branches || [];
        }
        return { products: cachedProducts, categories: cachedCategories, branches: cachedBranches };
      })
      .catch(() => ({ products: [], categories: [], branches: [] }))
      .finally(() => {
        pendingPromise = null;
      });
  }
  return pendingPromise;
}

export function useDynamicCatalogue() {
  const [products, setProducts] = useState<Product[]>(cachedProducts);
  const [categories, setCategories] = useState<Category[]>(cachedCategories);
  const [branches, setBranches] = useState<Branch[]>(cachedBranches);

  useEffect(() => {
    fetchClientCatalogue().then(({ products: p, categories: c, branches: b }) => {
      setProducts(p);
      setCategories(c);
      setBranches(b);
    });
  }, []);

  return { products, categories, branches };
}
