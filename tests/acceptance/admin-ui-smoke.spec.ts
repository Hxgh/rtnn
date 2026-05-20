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

async function expectStateBlockCentered(page: Page, text: string) {
  const stateBlock = page.locator("[data-admin-state-block]", { hasText: text }).first();
  if ((await stateBlock.count()) === 0) {
    return;
  }

  const metrics = await stateBlock.evaluate((block) => {
      const textNode = Array.from(block.querySelectorAll("p")).find((item) =>
        item.textContent?.includes(text),
      );

      if (!textNode) {
        return null;
      }

      const blockRect = block.getBoundingClientRect();
      const textRect = textNode.getBoundingClientRect();

      return {
        horizontalDelta: Math.abs(
          textRect.left + textRect.width / 2 - (blockRect.left + blockRect.width / 2),
        ),
        verticalDelta: Math.abs(
          textRect.top + textRect.height / 2 - (blockRect.top + blockRect.height / 2),
        ),
        textAlign: window.getComputedStyle(block).textAlign,
      };
    });

  expect(metrics).not.toBeNull();
  expect(metrics?.textAlign).toBe("center");
  expect(metrics?.horizontalDelta).toBeLessThanOrEqual(2);
  expect(metrics?.verticalDelta).toBeLessThanOrEqual(2);
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
  await page.getByRole("button", { name: "新建客户" }).click();
  const createCustomerDialog = page.getByRole("dialog");
  await expect(createCustomerDialog).toBeVisible();
  await expect(createCustomerDialog.locator("#create-customer-name")).toBeVisible();
  await expect(createCustomerDialog.locator("#create-customer-email")).toBeVisible();
  await createCustomerDialog.getByRole("button", { name: "取消" }).click();
  await expect(createCustomerDialog).toBeHidden();
  await page.locator("tbody tr").first().getByRole("button", { name: /^更新$/ }).click();
  const customerDialog = page.getByRole("dialog");
  await expect(customerDialog).toBeVisible();
  await expectDialogFieldGeometry(page, [
    "edit-customer-name",
    "edit-customer-phone",
  ]);
  await customerDialog.getByRole("button", { name: "取消" }).click();
  await expect(customerDialog).toBeHidden();
  await page.locator("tbody tr").first().getByRole("button", { name: "更新状态" }).click();
  const customerStatusDialog = page.getByRole("dialog");
  await expect(customerStatusDialog).toBeVisible();
  await expect(customerStatusDialog.locator("#edit-customer-status")).toBeVisible();
  await customerStatusDialog.getByRole("button", { name: "取消" }).click();
  await expect(customerStatusDialog).toBeHidden();
  await page.locator("tbody tr").first().getByRole("button", { name: "重置密码" }).click();
  const resetPasswordDialog = page.getByRole("dialog");
  await expect(resetPasswordDialog).toBeVisible();
  await expect(resetPasswordDialog.locator("#customer-reset-password-next")).toBeVisible();
  await expect(resetPasswordDialog.locator("#customer-reset-password-confirm")).toBeVisible();
  await resetPasswordDialog.getByRole("button", { name: "取消" }).click();
  await expect(resetPasswordDialog).toBeHidden();

  await page.getByRole("button", { name: "管理分组" }).click();
  const groupDialog = page.getByRole("dialog");
  await expect(groupDialog).toBeVisible();
  await expect(groupDialog.locator("#customer-group-name")).toBeVisible();
  await expect(groupDialog.locator("#customer-group-description")).toBeVisible();
  await expectStateBlockCentered(page, "暂无客户分组");
  await groupDialog.getByRole("button", { name: "取消" }).click();
  await expect(groupDialog).toBeHidden();

  await page.getByRole("button", { name: "管理标签" }).click();
  const tagDialog = page.getByRole("dialog");
  await expect(tagDialog).toBeVisible();
  await expect(tagDialog.locator("#customer-tag-name")).toBeVisible();
  await expect(tagDialog.locator("#customer-tag-color")).toBeVisible();
  await expectStateBlockCentered(page, "暂无客户标签");
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
  await expect(page.getByRole("combobox", { name: "分发状态" })).toBeVisible();
  await page.getByRole("combobox", { name: "分发状态" }).click();
  await expect(page.getByRole("option", { name: "已同步" })).toBeVisible();
  await page.keyboard.press("Escape");

  expect(consoleErrors).toEqual([]);
});
