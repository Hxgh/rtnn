import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  resolveTemplateEnv,
  getTemplateCookieKeys,
} from "../../scripts/lib/template-env.mjs";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const either = (...values: string[]) =>
  new RegExp(`^(?:${values.map(escapeRegExp).join("|")})$`);

const templateEnv = resolveTemplateEnv(process.cwd());
const cookieKeys = getTemplateCookieKeys(templateEnv);
const customerEmail =
  process.env.APP_ACCEPTANCE_CUSTOMER_EMAIL ?? templateEnv.TEMPLATE_CUSTOMER_EMAIL;
const customerPassword =
  process.env.APP_ACCEPTANCE_CUSTOMER_PASSWORD ?? templateEnv.TEMPLATE_CUSTOMER_PASSWORD;
const adminEmail =
  process.env.ADMIN_EMAIL ?? templateEnv.TEMPLATE_ADMIN_EMAIL;
const adminPassword =
  process.env.ADMIN_PASSWORD ?? templateEnv.TEMPLATE_ADMIN_PASSWORD;
const backendBaseUrl =
  process.env.APP_ACCEPTANCE_API_BASE_URL ?? "http://127.0.0.1:5110";

const loginHeading = either("登录", "Sign in");
const loginButtonText = either("登录", "Sign in");
const emailLabel = either("邮箱", "Email");
const passwordLabel = either("密码", "Password");

const sessionHeading = either("当前会话", "Current session", "账户摘要", "Account summary");
const meTitle = either("个人", "我的", "Me");
const accountTitle = either("账户安全", "Account Security");
const changePasswordButton = either("保存新密码", "Save new password");
const currentPasswordLabel = either("当前密码", "Current password");
const nextPasswordLabel = either("新密码", "New password");
const confirmPasswordLabel = either("确认新密码", "Confirm new password");
const logoutButton = either("退出登录", "Sign out");
const forbiddenTitle = either("无权限访问", "Access denied");
const nativeCapabilitiesTitle = either("设备服务", "Device Services");
const nativeScannerTitle = either("扫码", "Scan");
const nativeDiagnosticsTitle = either("设备诊断", "Device Diagnostics");

const refreshTokenCookieName = cookieKeys.customerRefreshToken;

test.describe.configure({ mode: "serial" });

async function loginCustomer(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: loginHeading })).toBeVisible();
  await page.getByLabel(emailLabel).fill(customerEmail);
  await page.getByLabel(passwordLabel).fill(customerPassword);

  const homeNavigation = page.waitForURL((url) => url.pathname === "/");
  await page.getByRole("button", { name: loginButtonText }).click();
  await homeNavigation;

  await expect(page.getByRole("heading", { name: sessionHeading })).toBeVisible();
}

async function loginAdmin(request: APIRequestContext) {
  const response = await request.post(`${backendBaseUrl}/api/v1/auth/admin/login`, {
    data: {
      email: adminEmail,
      password: adminPassword,
    },
    headers: {
      "accept-language": "zh-CN",
    },
  });

  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  return json.tokens.accessToken as string;
}

async function loginCustomerApi(request: APIRequestContext) {
  const response = await request.post(`${backendBaseUrl}/api/v1/auth/customer/login`, {
    data: {
      email: customerEmail,
      password: customerPassword,
    },
    headers: {
      "accept-language": "zh-CN",
    },
  });

  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  return json.tokens.refreshToken as string;
}

async function seedRefreshCookie(page: Page, refreshToken: string) {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: refreshTokenCookieName,
      value: refreshToken,
      url: page.url(),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function getCustomerId(request: APIRequestContext, adminAccessToken: string) {
  const response = await request.get(`${backendBaseUrl}/api/v1/admin/customers`, {
    params: {
      search: customerEmail,
      page: "1",
      pageSize: "20",
    },
    headers: {
      authorization: `Bearer ${adminAccessToken}`,
      "accept-language": "zh-CN",
    },
  });

  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  const customer = json.data.find(
    (item: { id: string; email: string }) => item.email === customerEmail,
  );
  expect(customer).toBeTruthy();
  return customer.id as string;
}

async function updateCustomerStatus(
  request: APIRequestContext,
  adminAccessToken: string,
  customerId: string,
  status: "active" | "blocked",
) {
  const response = await request.patch(
    `${backendBaseUrl}/api/v1/admin/customers/${customerId}/status`,
    {
      data: { status },
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "accept-language": "zh-CN",
      },
    },
  );

  expect(response.ok()).toBeTruthy();
}

async function expectBottomNavSafeAreaFilled(page: Page) {
  await expect(async () => {
    const navSurface = page.locator("nav > div").first();
    await expect(navSurface).toBeVisible();

    const [box, backgroundColor, viewport] = await Promise.all([
      navSurface.boundingBox(),
      navSurface.evaluate((element) => getComputedStyle(element).backgroundColor),
      page.viewportSize(),
    ]);

    expect(box).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(viewport!.height - 1);
    expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(backgroundColor).not.toBe("transparent");
  }).toPass();
}

async function expectContentClearsBottomNav(page: Page, selector: string) {
  await expect(async () => {
    const target = page.locator(selector).first();
    const navSurface = page.locator("nav > div").first();
    const scrollRoot = page.locator(".rtnn-app-scroll").first();

    await scrollRoot.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(target).toBeVisible();
    await expect(navSurface).toBeVisible();

    const [targetBox, navBox] = await Promise.all([
      target.boundingBox(),
      navSurface.boundingBox(),
    ]);

    expect(targetBox).toBeTruthy();
    expect(navBox).toBeTruthy();
    expect(Math.round(targetBox!.y + targetBox!.height)).toBeLessThanOrEqual(
      Math.round(navBox!.y) - 8,
    );
  }).toPass();
}

async function expectContentClearsViewportBottom(page: Page, selector: string) {
  await expect(async () => {
    const target = page.locator(selector).first();
    const scrollRoot = page.locator(".rtnn-app-scroll").first();
    const viewport = page.viewportSize();

    await scrollRoot.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(target).toBeVisible();

    const targetBox = await target.boundingBox();

    expect(targetBox).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(Math.round(targetBox!.y + targetBox!.height)).toBeLessThanOrEqual(
      viewport!.height - 8,
    );
  }).toPass();
}

test("app 客户端最小闭环验收", async ({ page }) => {
  await loginCustomer(page);

  const meLink = page.getByTestId("home-me-link");
  await expect(meLink).toBeVisible();
  await meLink.click();
  await page.waitForURL((url) => url.pathname === "/me");
  await expect(page.getByRole("heading", { name: meTitle })).toBeVisible();

  const accountLink = page.getByTestId("me-account-link");
  await expect(accountLink).toBeVisible();
  await accountLink.click();
  await page.waitForURL((url) => url.pathname === "/account");
  await expect(page.getByRole("heading", { name: accountTitle })).toBeVisible();

  await expect(page.getByLabel(currentPasswordLabel)).toBeVisible();
  await expect(page.getByLabel(nextPasswordLabel)).toBeVisible();
  await expect(page.getByLabel(confirmPasswordLabel)).toBeVisible();
  await expect(page.getByRole("button", { name: changePasswordButton })).toBeVisible();
  await expect(page.locator("nav")).toHaveCount(0);
  await expectContentClearsViewportBottom(page, 'button[type="submit"]');

  await page.goto("/me");
  await expect(page.getByRole("heading", { name: meTitle })).toBeVisible();
  await expectBottomNavSafeAreaFilled(page);
  await expectContentClearsBottomNav(page, 'button[type="submit"]');

  const deviceServicesLink = page.getByTestId("me-device-services-link");
  await expect(deviceServicesLink).toBeVisible();
  await deviceServicesLink.click();
  await page.waitForURL((url) => url.pathname === "/device-services");
  await expect(page.getByRole("heading", { name: nativeCapabilitiesTitle }).first()).toBeVisible();
  await expect(page.locator('a[href="/device-services/scan"]')).toContainText(nativeScannerTitle);
  await expect(page.locator('a[href="/native-diagnostics"]')).toContainText(nativeDiagnosticsTitle);
  await expect(page.locator("nav")).toHaveCount(0);
  await expectContentClearsViewportBottom(page, 'a[href="/native-diagnostics"]');

  await page.goto("/me");
  await expect(page.getByRole("heading", { name: meTitle })).toBeVisible();

  const logoutNavigation = page.waitForURL("**/login");
  await page.getByRole("button", { name: logoutButton }).click();
  await logoutNavigation;
  await expect(page.getByRole("heading", { name: loginHeading })).toBeVisible();
});

test("refresh 路由可恢复 customer 会话", async ({ page, request }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: loginHeading })).toBeVisible();

  const refreshToken = await loginCustomerApi(request);
  await seedRefreshCookie(page, refreshToken);
  await page.goto("/api/session/refresh?redirectTo=%2Fme");

  await page.waitForURL((url) => url.pathname === "/me");
  await expect(page.getByRole("heading", { name: meTitle })).toBeVisible();
});

test("refresh 路由在 refresh token 失效时会回到登录页", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: loginHeading })).toBeVisible();

  await seedRefreshCookie(page, "expired-refresh-token");
  await page.goto("/api/session/refresh?redirectTo=%2Fme");

  await page.waitForURL((url) => url.pathname === "/login");
  await expect(page.getByRole("heading", { name: loginHeading })).toBeVisible();
});

test("blocked customer 会进入 403 页面", async ({ page, request }) => {
  await loginCustomer(page);

  const adminAccessToken = await loginAdmin(request);
  const customerId = await getCustomerId(request, adminAccessToken);

  try {
    await updateCustomerStatus(request, adminAccessToken, customerId, "blocked");
    await page.goto("/me");

    await page.waitForURL((url) => url.pathname === "/403");
    await expect(page.getByText(forbiddenTitle)).toBeVisible();
  } finally {
    await updateCustomerStatus(request, adminAccessToken, customerId, "active");
  }
});
