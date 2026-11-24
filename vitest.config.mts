import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Same import aliases as tsconfig.json.
  resolve: {
    alias: [
      { find: /^@admin\//, replacement: dir("./src/app/admin/") },
      { find: /^@storefront\//, replacement: dir("./src/app/(storefront)/") },
      { find: /^@\//, replacement: dir("./src/") },
      { find: /^server-only$/, replacement: dir("./tests/setup/server-only.ts") },
    ],
  },
  test: {
    include: ["tests/**/*.test.{ts,js}"],
    // Security-rules tests need the Firebase emulators: run them with `npm run test:rules`.
    exclude: ["tests/rules/**", "**/node_modules/**"],
    environment: "node",
    setupFiles: ["tests/setup/local-storage.ts"],
    // The database tests boot an in-memory Postgres (PGlite) and apply every migration.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
