import {
  getTemplateCookieKeys,
  getTemplateDisplayNames,
  resolveTemplateEnv,
} from "./lib/template-env.mjs";

const templateEnv = resolveTemplateEnv(process.cwd());
const cookieKeys = getTemplateCookieKeys(templateEnv);
const templateDisplay = getTemplateDisplayNames(templateEnv);
const apiBaseUrl =
  process.env.API_BASE_URL ?? `http://localhost:${templateEnv.TEMPLATE_BACKEND_PORT}`;
const adminBaseUrl =
  process.env.ADMIN_BASE_URL ?? `http://localhost:${templateEnv.TEMPLATE_ADMIN_PORT}`;
const adminEmail = process.env.ADMIN_EMAIL ?? templateEnv.TEMPLATE_ADMIN_EMAIL;
const adminPassword =
  process.env.ADMIN_PASSWORD ?? templateEnv.TEMPLATE_ADMIN_PASSWORD;
const localeHeader = "zh-CN";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createHeaders(headers = {}) {
  return {
    "accept-language": localeHeader,
    ...headers,
  };
}

async function expectJson(response, label) {
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${label} 返回了非 JSON 响应: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(
      `${label} 失败: HTTP ${response.status} ${response.statusText} ${JSON.stringify(payload).slice(0, 400)}`,
    );
  }
  return payload;
}

async function expectHtml(response, label) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${label} 失败: HTTP ${response.status} ${response.statusText} ${text.slice(0, 400)}`,
    );
  }
  return text;
}

async function expectNextRedirect(response, label, expectedLocation) {
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400) {
    assert(
      location === expectedLocation,
      `${label} 重定向地址不正确，预期 ${expectedLocation}，实际 ${location}`,
    );
    return;
  }

  const html = await response.text();
  const metaRedirect = `url=${expectedLocation}`;
  assert(
    html.includes(metaRedirect),
    `${label} 未返回预期跳转，预期包含 ${metaRedirect}，实际状态 ${response.status}`,
  );
}

async function main() {
  console.log(`[smoke] apiBaseUrl=${apiBaseUrl}`);
  console.log(`[smoke] adminBaseUrl=${adminBaseUrl}`);

  const [healthz, readyz, openapi] = await Promise.all([
    fetch(`${apiBaseUrl}/healthz`, { headers: createHeaders() }).then((response) =>
      expectJson(response, "healthz"),
    ),
    fetch(`${apiBaseUrl}/readyz`, { headers: createHeaders() }).then((response) =>
      expectJson(response, "readyz"),
    ),
    fetch(`${apiBaseUrl}/openapi.json`, { headers: createHeaders() }).then((response) =>
      expectJson(response, "openapi"),
    ),
  ]);
  assert(healthz.status === "ok", "healthz 状态不正确");
  assert(readyz.status === "ready", "readyz 状态不正确");
  assert(readyz.database === "up", "readyz 数据库状态不正确");
  assert(openapi.paths["/api/v1/auth/admin/login"], "OpenAPI 缺少管理员登录接口");
  assert(openapi.paths["/api/v1/admin/customers"], "OpenAPI 缺少客户接口");
  assert(openapi.paths["/api/v1/admin/dashboard/stats"], "OpenAPI 缺少管理看板接口");
  assert(!openapi.paths["/api/v1/system/me"], "OpenAPI 仍然暴露了 system/me");
  assert(!openapi.paths["/api/v1/admin/settings/general"], "OpenAPI 仍然暴露了 settings 接口");
  console.log("[smoke] 后端公开接口通过");

  const loginResponse = await fetch(`${apiBaseUrl}/api/v1/auth/admin/login`, {
    method: "POST",
    headers: createHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });
  const login = await expectJson(loginResponse, "管理员登录");
  assert(login.user?.email === adminEmail, "登录返回的管理员邮箱不正确");
  assert(login.user?.audience === "admin", "登录返回的 audience 不正确");
  assert(typeof login.tokens?.accessToken === "string", "accessToken 缺失");
  assert(typeof login.tokens?.refreshToken === "string", "refreshToken 缺失");
  console.log("[smoke] 管理员登录通过");

  const accessToken = login.tokens.accessToken;
  const refreshToken = login.tokens.refreshToken;
  const authHeaders = createHeaders({
    authorization: `Bearer ${accessToken}`,
  });
  const cookie = `${cookieKeys.adminAccessToken}=${accessToken}; ${cookieKeys.adminRefreshToken}=${refreshToken}`;

  const [
    adminMe,
    dashboard,
    users,
    roles,
    permissions,
    customers,
    customerGroups,
    customerTags,
    auditLogs,
  ] = await Promise.all([
    fetch(`${apiBaseUrl}/api/v1/auth/admin/me`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取管理员会话")),
    fetch(`${apiBaseUrl}/api/v1/admin/dashboard/stats`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取看板统计")),
    fetch(`${apiBaseUrl}/api/v1/admin/users?page=1&pageSize=20`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取管理员列表")),
    fetch(`${apiBaseUrl}/api/v1/admin/roles?page=1&pageSize=20`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取角色列表")),
    fetch(`${apiBaseUrl}/api/v1/admin/permissions`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取权限列表")),
    fetch(`${apiBaseUrl}/api/v1/admin/customers?page=1&pageSize=20`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取客户列表")),
    fetch(`${apiBaseUrl}/api/v1/admin/customer-groups?page=1&pageSize=20`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取客户分组列表")),
    fetch(`${apiBaseUrl}/api/v1/admin/customer-tags?page=1&pageSize=20`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取客户标签列表")),
    fetch(`${apiBaseUrl}/api/v1/admin/audit-logs?page=1&pageSize=20`, {
      headers: authHeaders,
    }).then((response) => expectJson(response, "读取审计日志列表")),
  ]);

  assert(adminMe.user?.email === adminEmail, "auth/admin/me 返回的邮箱不正确");
  assert(adminMe.user?.audience === "admin", "auth/admin/me 返回的 audience 不正确");
  assert(Array.isArray(adminMe.user?.roles), "auth/admin/me 缺少角色列表");
  console.log("[smoke] auth/admin/me 通过");

  assert(typeof dashboard.totalAdminUsers === "number", "看板缺少 totalAdminUsers");
  assert(typeof dashboard.totalCustomers === "number", "看板缺少 totalCustomers");
  assert(typeof dashboard.totalRoles === "number", "看板缺少 totalRoles");
  console.log("[smoke] dashboard API 通过");

  assert(Array.isArray(users.data), "管理员列表 data 非数组");
  const adminUser = users.data.find((item) => item.email === adminEmail);
  assert(adminUser, "管理员列表中找不到 seed 管理员");
  assert(
    adminUser.name === templateEnv.TEMPLATE_ADMIN_DISPLAY_NAME,
    "seed 管理员名称不正确",
  );
  console.log("[smoke] users API 通过");

  assert(Array.isArray(roles.data), "角色列表 data 非数组");
  const superAdminRole = roles.data.find((item) => item.name === "Super Admin");
  assert(superAdminRole, "角色列表中找不到 Super Admin");
  console.log("[smoke] roles API 通过");

  assert(Array.isArray(permissions), "权限列表返回值不是数组");
  for (const requiredKey of [
    "admin:dashboard:view",
    "admin:users:view",
    "admin:roles:view",
    "admin:customers:view",
    "admin:audit-logs:view",
  ]) {
    assert(
      permissions.some((item) => item.key === requiredKey),
      `权限列表中缺少 ${requiredKey}`,
    );
  }
  assert(
    !permissions.some((item) => item.key === "admin:settings:update"),
    "权限列表仍然包含已移除的 settings 权限",
  );
  console.log("[smoke] permissions API 通过");

  assert(Array.isArray(customers.data), "客户列表 data 非数组");
  const seedCustomer = customers.data.find(
    (item) => item.email === templateEnv.TEMPLATE_CUSTOMER_EMAIL,
  );
  assert(seedCustomer, "客户列表中找不到 seed 客户");
  assert(
    seedCustomer.name === templateEnv.TEMPLATE_CUSTOMER_DISPLAY_NAME,
    "seed 客户名称不正确",
  );
  console.log("[smoke] customers API 通过");

  assert(Array.isArray(customerGroups.data), "客户分组列表 data 非数组");
  console.log("[smoke] customer-groups API 通过");

  assert(Array.isArray(customerTags.data), "客户标签列表 data 非数组");
  console.log("[smoke] customer-tags API 通过");

  assert(Array.isArray(auditLogs.data), "审计日志列表 data 非数组");
  console.log("[smoke] audit-logs API 通过");

  const redirects = [
    {
      label: "admin 根路由重定向",
      path: "/",
      headers: createHeaders(),
      location: "/dashboard",
    },
    {
      label: "admin 用户新建路由重定向",
      path: "/users/new",
      headers: createHeaders({ cookie }),
      location: "/users",
    },
    {
      label: "admin 角色新建路由重定向",
      path: "/roles/new",
      headers: createHeaders({ cookie }),
      location: "/roles",
    },
    {
      label: "admin 用户编辑路由重定向",
      path: `/users/${adminUser.id}/edit`,
      headers: createHeaders({ cookie }),
      location: `/users/${adminUser.id}`,
    },
    {
      label: "admin 角色编辑路由重定向",
      path: `/roles/${superAdminRole.id}/edit`,
      headers: createHeaders({ cookie }),
      location: `/roles/${superAdminRole.id}`,
    },
  ];

  for (const redirectCase of redirects) {
    const response = await fetch(`${adminBaseUrl}${redirectCase.path}`, {
      headers: redirectCase.headers,
      redirect: "manual",
    });
    await expectNextRedirect(response, redirectCase.label, redirectCase.location);
    console.log(`[smoke] ${redirectCase.label} 通过`);
  }

  const pages = [
    {
      label: "admin 登录页",
      path: "/login",
      includes: [templateDisplay.adminAppZh, "继续", "使用管理员账号登录控制台。"],
      headers: createHeaders(),
    },
    {
      label: "admin 看板页",
      path: "/dashboard",
      includes: ["系统运营看板", "用户规模", "客户规模", "角色数量"],
      headers: createHeaders({ cookie }),
    },
    {
      label: "admin 客户页",
      path: "/customers",
      includes: [
        "客户管理",
        "客户分组",
        "客户标签",
        templateEnv.TEMPLATE_CUSTOMER_EMAIL,
        templateEnv.TEMPLATE_CUSTOMER_DISPLAY_NAME,
      ],
      headers: createHeaders({ cookie }),
    },
    {
      label: "admin 用户页",
      path: "/users",
      includes: [
        "用户管理",
        adminEmail,
        templateEnv.TEMPLATE_ADMIN_DISPLAY_NAME,
        "super-admin",
      ],
      headers: createHeaders({ cookie }),
    },
    {
      label: "admin 用户详情页",
      path: `/users/${adminUser.id}`,
      includes: [
        "用户详情",
        adminEmail,
        templateEnv.TEMPLATE_ADMIN_DISPLAY_NAME,
        "super-admin",
      ],
      headers: createHeaders({ cookie }),
    },
    {
      label: "admin 角色页",
      path: "/roles",
      includes: ["角色管理", "Super Admin", "权限"],
      headers: createHeaders({ cookie }),
    },
    {
      label: "admin 角色详情页",
      path: `/roles/${superAdminRole.id}`,
      includes: ["角色详情", "Super Admin", "admin:dashboard:view"],
      headers: createHeaders({ cookie }),
    },
    {
      label: "admin 审计日志页",
      path: "/audit-logs",
      includes: ["审计日志", "操作者", "动作", "资源类型"],
      headers: createHeaders({ cookie }),
    },
    {
      label: "admin 个人中心页",
      path: "/account",
      includes: [
        "个人中心",
        adminEmail,
        templateEnv.TEMPLATE_ADMIN_DISPLAY_NAME,
        "修改密码",
      ],
      headers: createHeaders({ cookie }),
    },
  ];

  for (const page of pages) {
    const response = await fetch(`${adminBaseUrl}${page.path}`, {
      headers: page.headers,
      redirect: "manual",
    });
    const html = await expectHtml(response, page.label);
    for (const expected of page.includes) {
      assert(html.includes(expected), `${page.label} 未包含预期内容: ${expected}`);
    }
    assert(!html.includes("API unavailable"), `${page.label} 出现 API unavailable`);
    assert(!html.includes("/settings/general"), `${page.label} 仍然包含 settings 入口`);
    if (page.path === "/login") {
      const cssMatch = html.match(/href="([^"]+\.css)"/);
      assert(cssMatch?.[1], "admin 登录页未找到样式资源");
      const cssResponse = await fetch(new URL(cssMatch[1], adminBaseUrl), {
        headers: createHeaders(),
      });
      assert(cssResponse.ok, `admin 登录页样式资源加载失败: ${cssMatch[1]}`);
    }
    console.log(`[smoke] ${page.label} 通过`);
  }

  console.log("[smoke] 全部 HTTP 验收通过");
}

main().catch((error) => {
  console.error(`[smoke] 失败: ${error.message}`);
  process.exit(1);
});
