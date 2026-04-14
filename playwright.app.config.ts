import { defineConfig } from "@playwright/test";

const backendPort = Number(process.env.APP_ACCEPTANCE_BACKEND_PORT ?? "5110");
const appPort = Number(process.env.APP_ACCEPTANCE_PORT ?? "5120");
const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
const appBaseUrl = `http://localhost:${appPort}`;

export default defineConfig({
  testDir: "./scripts",
  testMatch: "app-acceptance.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: "test-results/playwright-app",
  use: {
    baseURL: process.env.APP_BASE_URL ?? appBaseUrl,
    headless: true,
    locale: "zh-CN",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: {
      width: 430,
      height: 932,
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
      command: "pnpm -C app start",
      url: `${appBaseUrl}/login`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        PORT: String(appPort),
        HOSTNAME: "127.0.0.1",
        NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
        BACKEND_INTERNAL_BASE_URL: backendBaseUrl,
        APP_ACCEPTANCE_API_BASE_URL: backendBaseUrl,
      },
    },
  ],
});
