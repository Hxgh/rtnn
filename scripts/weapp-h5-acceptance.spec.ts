import { expect, test } from "@playwright/test";
import { resolveTemplateEnv } from "./lib/template-env.mjs";

const templateEnv = resolveTemplateEnv(process.cwd());
const customerEmail =
  process.env.WEAPP_ACCEPTANCE_CUSTOMER_EMAIL ?? templateEnv.TEMPLATE_CUSTOMER_EMAIL;
const customerPassword =
  process.env.WEAPP_ACCEPTANCE_CUSTOMER_PASSWORD ?? templateEnv.TEMPLATE_CUSTOMER_PASSWORD;

test.describe.configure({ mode: "serial" });

test("weapp h5 客户端最小闭环验收", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("home-login-action")).toBeVisible();

  await page.getByTestId("home-login-action").click();
  await expect(page.getByTestId("login-submit-action")).toBeVisible();

  await page.locator('[data-testid="login-email-input"] input').fill(customerEmail);
  await page.locator('[data-testid="login-password-input"] input').fill(customerPassword);
  await Promise.all([
    page.waitForURL(/#\/pages\/index\/index/, { timeout: 15_000 }),
    page.getByTestId("login-submit-action").click(),
  ]);
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("home-auth-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("home-email-value")).toContainText(
    customerEmail,
  );

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("home-auth-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("home-email-value")).toContainText(
    customerEmail,
  );

  await Promise.all([
    page.waitForURL(/#\/pages\/profile\/index/, { timeout: 15_000 }),
    page.getByTestId("home-me-link").click(),
  ]);
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("profile-auth-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("profile-logout-action")).toBeVisible();
  await expect(page.getByTestId("profile-email-value")).toContainText(
    customerEmail,
  );

  await Promise.all([
    page.waitForURL(/#\/pages\/login\/index/, { timeout: 15_000 }),
    page.getByTestId("profile-logout-action").click(),
  ]);
  await expect(page.getByTestId("login-submit-action")).toBeVisible();
});
