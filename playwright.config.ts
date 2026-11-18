import { defineConfig, devices } from "@playwright/test";

/** End-to-end tests. Run with `make e2e` (inside the official Playwright container). */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  // The dev server compiles routes on first visit: more browsers at once only slow it down.
  workers: 2,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:3100",
    trace: "retain-on-failure",
    locale: "es-CL",
    timezoneId: "America/Santiago",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
