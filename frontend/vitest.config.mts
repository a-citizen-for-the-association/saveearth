import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ holds Playwright specs (their own `test`/`expect`, run via
    // `pnpm e2e`), not Vitest ones — exclude them from Vitest's discovery.
    exclude: ["node_modules/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "hooks/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text", "text-summary"],
      // Definition of Done 2.3: 80% line/branch coverage on lib/ + hooks/.
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
