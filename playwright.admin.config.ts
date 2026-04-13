import { defineConfig } from "@playwright/test";

const backendPort = Number(process.env.ADMIN_ACCEPTANCE_BACKEND_PORT ?? "5110");
const adminPort = Number(process.env.ADMIN_ACCEPTANCE_PORT ?? "5111");
const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
const adminBaseUrl = `http://127.0.0.1:${adminPort}`;

export default defineConfig({
  testDir: "./scripts",
  testMatch: "admin-acceptance.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: "test-results/playwright",
  use: {
    baseURL: process.env.ADMIN_BASE_URL ?? adminBaseUrl,
    headless: true,
    locale: "zh-CN",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: {
      width: 1440,
      height: 960,
    },
    extraHTTPHeaders: {
      "accept-language": "zh-CN",
    },
  },
  webServer: [
    {
      command: "pnpm -C backend start:prod",
      url: `${backendBaseUrl}/healthz`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        PORT: String(backendPort),
      },
    },
    {
      command: "pnpm -C admin start",
      url: `${adminBaseUrl}/login`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        PORT: String(adminPort),
        HOSTNAME: "127.0.0.1",
        NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
      },
    },
  ],
});
