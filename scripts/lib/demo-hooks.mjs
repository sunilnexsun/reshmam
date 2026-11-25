// Node module hooks that let scripts/seed-demo.mjs load the admin panel's sample data
// (src/app/admin/_lib/seed.js), which is written for the Next.js bundler: the @admin alias, imports without a
// file extension, ESM in .js files, and product photos imported as modules.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ADMIN = new URL("../../src/app/admin/", import.meta.url);
const SRC = new URL("../../src/", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@admin/")) return { url: new URL(specifier.slice("@admin/".length), ADMIN).href, shortCircuit: true };
  if (specifier.startsWith(".") && context.parentURL?.startsWith(SRC) && !/\.[a-z0-9]+$/i.test(specifier)) {
    const url = new URL(`${specifier}.js`, context.parentURL);
    if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".webp")) {
    // The same photos are served from public/images, so the seeded records point there.
    const name = url.split("/").pop().replace(/\.webp$/, "");
    const src = existsSync(fileURLToPath(new URL(`../../public/images/product-${name}.webp`, import.meta.url)))
      ? `/images/product-${name}.webp`
      : `/images/${name}.webp`;
    return { format: "module", source: `export default ${JSON.stringify({ src })};`, shortCircuit: true };
  }
  if (url.startsWith(SRC) && url.endsWith(".js")) return next(url, { ...context, format: "module" });
  return next(url, context);
}
