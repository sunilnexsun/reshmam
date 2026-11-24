import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Firestore and Storage security rules, tested against the Firebase emulators. Run with `npm run test:rules`
// (it starts the emulators); the default `npm test` excludes these.
export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: dir("./src/") }] },
  test: {
    include: ["tests/rules/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
