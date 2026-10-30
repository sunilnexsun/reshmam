"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Menu,
  ShoppingCart,
  User,
  X,
  Heart,
} from "lucide-react";
import { Logo } from "./Logo";
import { navLinks } from "@/lib/site";
import { categories } from "@/lib/products";
import { useCartItems, useWishlist } from "@/lib/store";
import { cn } from "../ui/primitives";

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

function CartButton() {
  const items = useCartItems();
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-forest-800 hover:bg-leaf-100"
      aria-label={`Shopping cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <ShoppingCart className="h-6 w-6" aria-hidden />
      <span
        aria-hidden
        className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-forest-800 px-1 text-[10px] font-bold text-white"
      >
        {count}
      </span>
    </Link>
  );
}

function ProductsMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDoc = (e: MouseEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <li ref={ref} className="group relative">
      <div className="flex items-center">
        <Link
          href="/products"
          aria-current={active ? "page" : undefined}
          className={cn(navItemClass, active && navActiveClass)}
        >
          Products
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="products-menu"
          aria-label="Show product categories"
          onClick={() => setOpen((o) => !o)}
          className="-ml-2 inline-flex h-9 w-7 items-center justify-center rounded text-forest-800"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      <div
        id="products-menu"
        className={cn("absolute left-0 top-full z-50 w-72 pt-2 group-hover:block", open ? "block" : "hidden")}
      >
        <ul className="rounded-xl border border-beige-300 bg-white p-2 shadow-card-hover">
          <li>
            <Link
              href="/products"
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-forest-800 hover:bg-cream"
            >
              All Products
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/products?category=${c.slug}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-cream"
              >
                <Image
                  src={c.image}
                  alt=""
                  width={40}
                  height={28}
                  className="h-8 w-10 rounded object-cover"
                />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

const navItemClass =
  "relative inline-flex h-11 items-center whitespace-nowrap px-2.5 text-[15px] font-medium text-ink hover:text-forest-800 xl:px-4";
const navActiveClass =
  "text-forest-800 after:absolute after:inset-x-2.5 after:bottom-1.5 after:h-0.5 after:rounded after:bg-forest-800 xl:after:inset-x-4";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(76);
  const headerRef = useRef<HTMLElement>(null);
  const [lastPath, setLastPath] = useState(pathname);
  const wish = useWishlist();
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-40 border-b border-beige-300/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
      >
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:px-8 xl:grid-cols-[1fr_auto_1fr]">
          <Logo className="lg:justify-self-start" />
          <nav aria-label="Main" className="hidden lg:block lg:justify-self-center">
            <ul className="flex items-center">
              {navLinks.map((l) =>
                l.href === "/products" ? (
                  <ProductsMenu
                    key={l.href}
                    active={isActive(pathname, l.href)}
                  />
                ) : (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={
                        isActive(pathname, l.href) ? "page" : undefined
                      }
                      className={cn(
                        navItemClass,
                        isActive(pathname, l.href) && navActiveClass,
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-0.5 lg:ml-0 lg:justify-self-end">
            <Link
              href="/account"
              aria-label="My account"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-forest-800 hover:bg-leaf-100"
            >
              <User className="h-6 w-6" aria-hidden />
            </Link>
            <CartButton />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-forest-800 hover:bg-leaf-100 lg:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => {
                setMenuTop(
                  headerRef.current?.getBoundingClientRect().bottom ?? 76,
                );
                setMobileOpen((o) => !o);
              }}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" aria-hidden />
              ) : (
                <Menu className="h-6 w-6" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-cream lg:hidden"
          style={{ top: menuTop }}
        >
          <div className="space-y-6 px-4 py-5 sm:px-6">
            <nav aria-label="Mobile">
              <ul className="divide-y divide-beige-300 rounded-xl border border-beige-300 bg-white">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={
                        isActive(pathname, l.href) ? "page" : undefined
                      }
                      className={cn(
                        "flex min-h-12 items-center px-4 text-base font-medium",
                        isActive(pathname, l.href)
                          ? "text-forest-800 font-semibold"
                          : "text-ink",
                      )}
                    >
                      {l.label}
                    </Link>
                    {l.href === "/products" && (
                      <ul className="grid grid-cols-2 gap-2 px-4 pb-3">
                        {categories.map((c) => (
                          <li key={c.slug}>
                            <Link
                              href={`/products?category=${c.slug}`}
                              className="flex min-h-10 items-center rounded-lg bg-cream px-3 text-sm text-forest-800"
                            >
                              {c.shortName}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li>
                <Link
                  href="/wishlist"
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-beige-300 bg-white px-3"
                >
                  <Heart className="h-4 w-4 text-forest-800" aria-hidden />{" "}
                  Wishlist ({wish.length})
                </Link>
              </li>
              <li>
                <Link
                  href="/track-order"
                  className="flex min-h-11 items-center rounded-lg border border-beige-300 bg-white px-3"
                >
                  Track Order
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
