import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { resolveTemplateEnv } from "../../scripts/lib/template-env.mjs";

const templateEnv = resolveTemplateEnv(process.cwd());
const adminEmail = process.env.ADMIN_EMAIL ?? templateEnv.TEMPLATE_ADMIN_EMAIL;
const adminPassword =
  process.env.ADMIN_PASSWORD ?? templateEnv.TEMPLATE_ADMIN_PASSWORD;

const ignoredConsolePatterns = [
  /Download the React DevTools/i,
];

function installConsoleGuards(page: Page) {
  const errors: string[] = [];

  function record(source: string, message: string) {
    if (ignoredConsolePatterns.some((pattern) => pattern.test(message))) {
      return;
    }
    errors.push(`${source}: ${message}`);
  }

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") {
      record("console", message.text());
    }
  });

  page.on("pageerror", (error) => {
    record("pageerror", error.message);
  });

  return errors;
}

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(adminEmail);
  await page.locator("#password").fill(adminPassword);
  await page.getByRole("button", { name: "继续" }).click();
  await page.waitForURL("**/dashboard");
}

async function expectDialogFieldGeometry(page: Page, fieldIds: string[]) {
  const metrics = await page.evaluate((ids) => {
    return ids.map((id) => {
      const input = document.getElementById(id);
      const field = input?.closest(".grid");
      const label = input?.labels?.[0] ?? field?.querySelector("label");

      if (!input || !field || !label) {
        return null;
      }

      const inputRect = input.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      return {
        id,
        fieldHeight: fieldRect.height,
        fieldTop: fieldRect.top,
        inputTop: inputRect.top,
        labelTop: labelRect.top,
      };
    });
  }, fieldIds);

  expect(metrics.every(Boolean)).toBe(true);
  const [first, ...rest] = metrics.filter(Boolean) as Array<{
    fieldHeight: number;
    fieldTop: number;
    inputTop: number;
    labelTop: number;
  }>;

  for (const item of rest) {
    expect(Math.abs(item.fieldTop - first.fieldTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(item.labelTop - first.labelTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(item.inputTop - first.inputTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(item.fieldHeight - first.fieldHeight)).toBeLessThanOrEqual(1);
  }
}

test("admin 管理页基础交互不会退化", async ({ page }) => {
  const consoleErrors = installConsoleGuards(page);

  await login(page);

  await page.getByRole("link", { name: "用户管理" }).click();
  await page.waitForURL("**/users");
  await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.locator("tbody tr").first().getByRole("button", { name: /^更新$/ }).click();
  const userDialog = page.getByRole("dialog");
  await expect(userDialog).toBeVisible();
  await expect(userDialog.locator("#edit-user-name")).toBeVisible();
  await expect(userDialog.locator("#edit-user-status")).toBeVisible();
  await userDialog.getByRole("button", { name: "取消" }).click();
  await expect(userDialog).toBeHidden();

  await page.getByRole("link", { name: "客户管理" }).click();
  await page.waitForURL("**/customers");
  await expect(page.getByRole("heading", { name: "客户管理" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "客户分组" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "客户标签" })).toBeVisible();
  await page.locator("tbody tr").first().getByRole("button", { name: /^更新$/ }).click();
  const customerDialog = page.getByRole("dialog");
  await expect(customerDialog).toBeVisible();
  await expectDialogFieldGeometry(page, [
    "edit-customer-name",
    "edit-customer-phone",
  ]);
  await customerDialog.getByRole("button", { name: "取消" }).click();
  await expect(customerDialog).toBeHidden();

  await page.getByRole("button", { name: "管理分组" }).click();
  const groupDialog = page.getByRole("dialog");
  await expect(groupDialog).toBeVisible();
  await expect(groupDialog.locator("#customer-group-name")).toBeVisible();
  await expect(groupDialog.locator("#customer-group-description")).toBeVisible();
  await groupDialog.getByRole("button", { name: "取消" }).click();
  await expect(groupDialog).toBeHidden();

  await page.getByRole("button", { name: "管理标签" }).click();
  const tagDialog = page.getByRole("dialog");
  await expect(tagDialog).toBeVisible();
  await expect(tagDialog.locator("#customer-tag-name")).toBeVisible();
  await expect(tagDialog.locator("#customer-tag-color")).toBeVisible();
  await tagDialog.getByRole("button", { name: "取消" }).click();
  await expect(tagDialog).toBeHidden();

  await page.getByRole("link", { name: "角色管理" }).click();
  await page.waitForURL("**/roles");
  await expect(page.getByRole("heading", { name: "角色管理" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.locator("tbody tr").first().getByRole("button", { name: /^更新$/ }).click();
  const roleDialog = page.getByRole("dialog");
  await expect(roleDialog).toBeVisible();
  await expect(roleDialog.locator("#edit-role-name")).toBeVisible();
  await expect(roleDialog.locator("#edit-role-description")).toBeVisible();
  await roleDialog.getByRole("button", { name: "取消" }).click();
  await expect(roleDialog).toBeHidden();

  await page.getByRole("link", { name: "发布中心" }).click();
  await page.waitForURL("**/client-releases");
  await expect(page.getByRole("heading", { name: "发布中心" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "环境" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "客户端" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "平台" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
