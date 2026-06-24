import { defineConfig } from "vitest/config";
import path from "path";

// Config mínima e isolada (não carrega o vite.config do app, que tem o proxy/tailwind).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
