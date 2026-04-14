import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  getTemplateDisplayNames,
  resolveTemplateEnv,
} from "./lib/template-env.mjs";

const templateEnv = resolveTemplateEnv(process.cwd());
const templateDisplay = getTemplateDisplayNames(templateEnv);
const adminEmail = process.env.ADMIN_EMAIL ?? templateEnv.TEMPLATE_ADMIN_EMAIL;
const adminPassword =
  process.env.ADMIN_PASSWORD ?? templateEnv.TEMPLATE_ADMIN_PASSWORD;
const adminDisplayName = templateEnv.TEMPLATE_ADMIN_DISPLAY_NAME;
const customerPassword = templateEnv.TEMPLATE_CUSTOMER_PASSWORD;
const testEmailDomain = `${templateEnv.TEMPLATE_PROJECT_ID}.local`;

test.describe.configure({ mode: "serial" });

async function settleDialog(dialog: Locator) {
  try {
    await expect(dialog).toBeHidden({ timeout: 1500 });
  } catch {
    await dialog.getByRole("button", { name: "取消" }).click();
    await expect(dialog).toBeHidden();
  }
}

async function selectComboboxOption(
  page: Page,
  combobox: Locator,
  optionName: string,
) {
  await combobox.click();
  await page.getByRole("option", { name: optionName }).click();
}

test("admin 首发边界界面验收", async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const roleName = `验收角色${suffix}`;
  const roleDescription = `自动化验收角色 ${suffix}`;
  const updatedRoleDescription = `自动化验收角色已更新 ${suffix}`;
  const userName = `验收用户${suffix}`;
  const updatedUserName = `验收用户已更新${suffix}`;
  const userEmail = `acceptance-user-${suffix}@${testEmailDomain}`;
  const customerName = `验收客户${suffix}`;
  const updatedCustomerName = `验收客户已更新${suffix}`;
  const customerEmail = `acceptance-customer-${suffix}@${testEmailDomain}`;

  await page.goto("/login");
  await expect(page).toHaveTitle(new RegExp(templateDisplay.adminAppZh));
  await expect(page.getByText(templateDisplay.adminAppZh).first()).toBeVisible();
  await expect(page.getByText("使用管理员账号登录控制台。")).toBeVisible();

  await page.locator("#email").fill(adminEmail);
  await page.locator("#password").fill(adminPassword);
  await page.getByRole("button", { name: "继续" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "系统运营看板" })).toBeVisible();
  await expect(page.getByRole("link", { name: "总览" })).toBeVisible();
  await expect(page.getByRole("link", { name: "客户管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "用户管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "角色管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "审计日志" })).toBeVisible();
  await expect(page.locator('a[href="/settings/general"]')).toHaveCount(0);
  await page.screenshot({ path: "test-results/admin-dashboard.png", fullPage: true });

  await page.getByRole("link", { name: "角色管理" }).click();
  await page.waitForURL("**/roles");
  await expect(page.getByRole("heading", { name: "角色管理" })).toBeVisible();
  await page.getByRole("button", { name: "新建角色" }).click();

  const roleDialog = page.getByRole("dialog");
  await expect(roleDialog).toBeVisible();
  await roleDialog.locator("#create-role-name").fill(roleName);
  await roleDialog.locator("#create-role-description").fill(roleDescription);
  await roleDialog.getByRole("checkbox", { name: /View Users/ }).click();
  await roleDialog.getByRole("checkbox", { name: /View Dashboard/ }).click();
  await roleDialog.getByRole("button", { name: "创建" }).click();
  await settleDialog(roleDialog);
  await page.reload();

  await page.locator('input[name="search"]').first().fill(roleName);
  await page.getByRole("button", { name: "搜索" }).first().click();
  const roleRow = page.locator("tbody tr", { hasText: roleName }).first();
  await expect(roleRow).toContainText(roleName);

  await roleRow.getByRole("button", { name: "更新" }).click();
  await expect(roleDialog).toBeVisible();
  await roleDialog.locator("#edit-role-description").fill(updatedRoleDescription);
  await roleDialog.getByRole("checkbox", { name: /View Customers/ }).click();
  await roleDialog.getByRole("button", { name: "更新" }).click();
  await settleDialog(roleDialog);
  await page.reload();

  await roleRow.getByRole("link", { name: "详情" }).click();
  await page.waitForURL(/\/roles\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "角色详情" })).toBeVisible();
  await expect(page.getByText(roleName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(updatedRoleDescription)).toBeVisible();
  await expect(page.getByText("admin:users:view")).toBeVisible();
  await expect(page.getByText("admin:customers:view")).toBeVisible();

  await page.getByRole("link", { name: "用户管理" }).click();
  await page.waitForURL("**/users");
  await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
  await page.getByRole("button", { name: "新建用户" }).click();

  const userDialog = page.getByRole("dialog");
  await expect(userDialog).toBeVisible();
  await userDialog.locator("#create-user-name").fill(userName);
  await userDialog.locator("#create-user-email").fill(userEmail);
  await userDialog.locator("#create-user-password").fill(adminPassword);
  await userDialog.getByRole("checkbox", { name: new RegExp(roleName) }).click();
  await userDialog.getByRole("button", { name: "创建" }).click();
  await settleDialog(userDialog);
  await page.reload();

  await page.locator('input[name="search"]').first().fill(userEmail);
  await page.getByRole("button", { name: "搜索" }).first().click();
  const userRow = page.locator("tbody tr", { hasText: userEmail }).first();
  await expect(userRow).toContainText(userName);
  await expect(userRow).toContainText(roleName);

  await userRow.getByRole("link", { name: "详情" }).click();
  await page.waitForURL(/\/users\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "用户详情" })).toBeVisible();
  await expect(page.getByText(userEmail).first()).toBeVisible();
  await expect(page.getByText(roleName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "更新" }).click();
  await expect(userDialog).toBeVisible();
  await userDialog.locator("#edit-user-name").fill(updatedUserName);
  await selectComboboxOption(page, userDialog.locator("#edit-user-status"), "禁用");
  await userDialog.getByRole("button", { name: "更新" }).click();
  await settleDialog(userDialog);
  await page.reload();
  await expect(
    page.getByRole("definition").filter({ hasText: updatedUserName }).first(),
  ).toBeVisible();
  await expect(page.getByText("禁用").first()).toBeVisible();

  await page.getByRole("link", { name: "客户管理" }).click();
  await page.waitForURL("**/customers");
  await expect(page.getByRole("heading", { name: "客户管理" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "客户分组" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "客户标签" })).toBeVisible();
  await page.getByRole("button", { name: "新建客户" }).click();

  const customerDialog = page.getByRole("dialog");
  await expect(customerDialog).toBeVisible();
  await customerDialog.locator("#create-customer-name").fill(customerName);
  await customerDialog.locator("#create-customer-phone").fill("13800138000");
  await customerDialog.locator("#create-customer-email").fill(customerEmail);
  await customerDialog.locator("#create-customer-password").fill(customerPassword);
  await customerDialog.getByRole("button", { name: "创建" }).click();
  await settleDialog(customerDialog);
  await page.reload();

  await page.locator('input[name="search"]').first().fill(customerEmail);
  await page.getByRole("button", { name: "搜索" }).first().click();
  const customerRow = page.locator("tbody tr", { hasText: customerEmail }).first();
  await expect(customerRow).toContainText(customerName);
  await expect(customerRow).toContainText("13800138000");

  await customerRow.getByRole("button", { name: "更新" }).click();
  await expect(customerDialog).toBeVisible();
  await customerDialog.locator("#edit-customer-name").fill(updatedCustomerName);
  await customerDialog.locator("#edit-customer-phone").fill("13900139000");
  await customerDialog.getByRole("button", { name: "更新" }).click();
  await settleDialog(customerDialog);
  await page.reload();
  await expect(customerRow).toContainText(updatedCustomerName);
  await expect(customerRow).toContainText("13900139000");
  await page.screenshot({ path: "test-results/admin-customers.png", fullPage: true });

  await page.getByRole("link", { name: "审计日志" }).click();
  await page.waitForURL("**/audit-logs");
  await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible();
  await page.locator('input[name="action"]').fill("admin.customer.create");
  await selectComboboxOption(
    page,
    page.getByRole("combobox", { name: "操作者类型" }),
    "管理员",
  );
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("admin.customer.create");
  await expect(page.locator("tbody tr").first()).toContainText("管理员");

  await page.getByRole("button", { name: new RegExp(adminDisplayName) }).click();
  await page.getByRole("menuitem", { name: "个人信息" }).click();
  await page.waitForURL("**/account");
  await expect(page.getByRole("heading", { name: "个人中心" })).toBeVisible();
  await expect(page.getByText(adminEmail).first()).toBeVisible();
  await expect(page.getByText("super-admin")).toBeVisible();
  await page.getByRole("button", { name: "修改密码" }).click();

  const passwordDialog = page.getByRole("dialog");
  await expect(passwordDialog).toBeVisible();
  await expect(passwordDialog.locator("#currentPassword")).toBeVisible();
  await expect(passwordDialog.locator("#nextPassword")).toBeVisible();
  await expect(passwordDialog.locator("#confirmPassword")).toBeVisible();
  await passwordDialog.getByRole("button", { name: "取消" }).click();
  await expect(passwordDialog).toBeHidden();
  await page.screenshot({ path: "test-results/admin-account.png", fullPage: true });

  await page.getByRole("button", { name: new RegExp(adminDisplayName) }).click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByText(templateDisplay.adminAppZh).first()).toBeVisible();
});
