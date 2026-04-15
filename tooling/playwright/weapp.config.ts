import { defineConfig } from "@playwright/test";

const backendPort = Number(process.env.WEAPP_ACCEPTANCE_BACKEND_PORT ?? "5100");
const weappPort = Number(process.env.WEAPP_ACCEPTANCE_PORT ?? "5103");
const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
const weappBaseUrl = `http://127.0.0.1:${weappPort}`;

export default defineConfig({
  testDir: "../../tests/acceptance",
  testMatch: "weapp-h5-acceptance.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: "../../.artifacts/playwright/weapp",
  use: {
    baseURL: process.env.WEAPP_BASE_URL ?? weappBaseUrl,
    browserName: "chromium",
    channel: "chrome",
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
      command: "pnpm --filter backend start:prod",
      url: `${backendBaseUrl}/healthz`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        PORT: String(backendPort),
      },
    },
    {
      command: `pnpm --filter weapp exec taro build --type h5 --watch -p ${weappPort}`,
      url: weappBaseUrl,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        TARO_APP_API_BASE_URL: backendBaseUrl,
      },
    },
  ],
});
