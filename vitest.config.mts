import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/*
 * Tests fuer die Rechenlogik in lib/ (Zeiten, Bestzeiten,
 * Pflichtzeiten, Wettkampf-Auswertung, PDF-Parser).
 * Starten mit: npm test
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
