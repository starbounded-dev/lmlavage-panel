import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: { command: "npm.cmd run build && npm.cmd run start", url: "http://127.0.0.1:3000/tableau-de-bord", reuseExistingServer: true, timeout: 180_000, env: { ALLOW_DEMO_MODE: "true" } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
