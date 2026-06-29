import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Vitest config. The `@/` alias mirrors the tsconfig path mapping so tests can
// import app modules the same way the app does (e.g. `@/lib/paystack`).
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".next"],
  },
});
