import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the deployed Railway test environment (no local server):
 *   E2E_BASE_URL=https://<your-app>.up.railway.app npm run e2e
 * Tests create real (test-environment) records in PostgreSQL.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
