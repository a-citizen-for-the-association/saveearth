import { defineConfig, devices } from "@playwright/test";

// No `webServer` entry here on purpose: Anvil, contract deployment/seeding,
// and the Next.js dev server all need to exist *before* the app's first
// request (env vars are read at server start), so e2e/global-setup.ts does
// all of that itself and hands back a teardown function, rather than
// relying on Playwright's webServer feature — see that file's comments.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
