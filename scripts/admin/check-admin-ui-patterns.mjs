import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");
const LEGACY_APP_BRAND = ["RTNN", "App"].join(" ");

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout;
}

function listTrackedAdminFiles() {
  return runGit(["ls-files", "-z", "apps/admin/app", "apps/admin/src"])
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((filePath) => /\.(tsx?|mjs|json)$/.test(filePath));
}

function readFile(filePath) {
  return readFileSync(path.join(ROOT_DIR, filePath), "utf8");
}

function addFinding(findings, filePath, message) {
  findings.push(`[admin-ui] ${filePath}: ${message}`);
}

function checkForbiddenContent(findings, filePath, content) {
  const checks = [
    {
      pattern: new RegExp(`\\b${LEGACY_APP_BRAND}\\b`),
      message: `用户可见名称不应回退为 ${LEGACY_APP_BRAND}`,
    },
    {
      pattern: /\bNext\.js\b/,
      message: "不应出现默认框架品牌文案",
    },
    {
      pattern: /模板演示|示例模块/,
      message: "正式后台不应出现演示/示例文案",
    },
    {
      pattern: /redirect\(`\/(?:users|roles)\/\$\{id\}`\)/,
      message: "后台路由跳转必须通过 adminRoutes",
    },
  ];

  for (const { pattern, message } of checks) {
    if (pattern.test(content)) {
      addFinding(findings, filePath, message);
    }
  }
}

function checkAdminInformationHierarchy(findings, filePath, content) {
  if (!filePath.startsWith("apps/admin/")) {
    return;
  }

  if (
    filePath.endsWith("roles/role-form-dialogs.tsx") &&
    /description=\{permission\.key\}/.test(content)
  ) {
    addFinding(findings, filePath, "角色权限选择不应把 permission.key 作为用户可见描述");
  }

  if (
    filePath.endsWith("roles/[id]/page.tsx") &&
    /values=\{(?:permissionKeys|role\.permissions)/.test(content)
  ) {
    addFinding(findings, filePath, "角色详情不应直接展示权限 key 列表");
  }

  if (
    filePath.endsWith("audit-logs/page.tsx") &&
    /formatAuditAction\(|secondary:\s*parts\.slice|item\.resourceType\}</.test(content)
  ) {
    addFinding(findings, filePath, "审计日志动作和资源类型应使用正式展示 formatter");
  }

  if (
    filePath.includes("client-releases") &&
    /label:\s*value,\s*value|>\{(?:item|policy|release)\.channel\}<|\$\{filters\.channel\}/.test(content)
  ) {
    addFinding(findings, filePath, "发布环境应使用 formatClientReleaseChannel 展示");
  }
}

function checkAdminComponents(findings, filePath, content) {
  if (!filePath.startsWith("apps/admin/src/components/admin/")) {
    return;
  }

  const allowedFormDialog = filePath === "apps/admin/src/components/admin/form-dialog.tsx";
  const allowedStateBlock = filePath === "apps/admin/src/components/admin/state-block.tsx";

  if (!allowedFormDialog && /\bfunction\s+SubmitButton\b/.test(content)) {
    addFinding(findings, filePath, "后台表单弹窗提交按钮应复用 form-dialog.tsx");
  }

  if (!allowedFormDialog && /\bfunction\s+FormField\b/.test(content)) {
    addFinding(findings, filePath, "后台表单字段应复用 form-dialog.tsx");
  }

  if (!allowedStateBlock && /rounded-xl border border-dashed/.test(content)) {
    addFinding(findings, filePath, "后台空态应复用 state-block.tsx");
  }
}

function checkTableActionTrigger(findings) {
  const filePath = "apps/admin/src/components/admin/table-page.tsx";
  if (!existsSync(path.join(ROOT_DIR, filePath))) {
    return;
  }

  const content = readFile(filePath);
  if (!/AdminTableActionButton\s*=\s*forwardRef/.test(content)) {
    addFinding(
      findings,
      filePath,
      "表格行操作按钮必须 forwardRef，确保 DialogTrigger asChild 能打开弹窗",
    );
  }
}

function checkRouteErrorBoundaries(findings, filePath, content) {
  if (!/^apps\/admin\/app\/(?:.*\/)?error\.tsx$/.test(filePath)) {
    return;
  }

  if (/error\.message/.test(content)) {
    addFinding(findings, filePath, "错误边界不应直接展示 error.message");
  }

  if (!content.includes("AdminStateBlock") && !content.includes("RouteStateBlock")) {
    addFinding(findings, filePath, "错误边界应复用后台状态组件");
  }
}

function checkHydrationSafeFormatting(findings, filePath, content) {
  if (!filePath.startsWith("apps/admin/app/")) {
    return;
  }

  if (/\.toLocaleString\(locale\)/.test(content)) {
    addFinding(
      findings,
      filePath,
      "后台服务端页面时间展示应使用 formatAdminDateTime，避免服务端与浏览器时区/格式差异导致 hydration 错误",
    );
  }
}

function checkDialogA11y(findings, filePath, content) {
  if (!filePath.startsWith("apps/admin/")) {
    return;
  }

  if (!content.includes("<DialogContent")) {
    return;
  }

  if (!content.includes("DialogDescription")) {
    addFinding(
      findings,
      filePath,
      "后台 DialogContent 必须包含 DialogDescription，避免 Radix aria-describedby 警告",
    );
  }
}

function checkDialogFormFields(findings, filePath, content) {
  if (!filePath.startsWith("apps/admin/")) {
    return;
  }

  if (!content.includes("AdminFormField") || !content.includes("<DialogContent")) {
    return;
  }

  const dialogBlocks = content.match(/<DialogContent\b[\s\S]*?<\/DialogContent>/g) ?? [];
  if (dialogBlocks.length === 0) {
    return;
  }

  const directLabelPattern = /<Label\b/;
  const simpleFieldPattern =
    /<div\s+className=(?:"grid gap-2"|'grid gap-2')[\s\S]*?<Label\b/;

  const hasMixedDialogFields = dialogBlocks.some((block) => {
    if (!block.includes("AdminFormField")) {
      return false;
    }

    const withoutAdminFormFields = block.replace(
      /<AdminFormField\b[\s\S]*?<\/AdminFormField>/g,
      "",
    );

    return (
      directLabelPattern.test(withoutAdminFormFields) ||
      simpleFieldPattern.test(withoutAdminFormFields)
    );
  });

  if (hasMixedDialogFields) {
    addFinding(
      findings,
      filePath,
      "后台弹窗表单字段应统一使用 AdminFormField，避免同一弹窗字段高度和错误提示预留不一致",
    );
  }
}

function checkExternalStoreHydration(findings, filePath, content) {
  if (!filePath.startsWith("apps/admin/") || !content.includes("useSyncExternalStore(")) {
    return;
  }

  const calls = content.matchAll(
    /useSyncExternalStore\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*,?\s*\)/gs,
  );

  for (const match of calls) {
    const [, , getSnapshot, getServerSnapshot] = match;
    if (getSnapshot === getServerSnapshot) {
      addFinding(
        findings,
        filePath,
        "useSyncExternalStore 的 server snapshot 不能复用浏览器 snapshot，避免 SSR/CSR 首帧不一致",
      );
    }
  }
}

function checkRouteStatePages(findings) {
  const routeStatePages = [
    "apps/admin/app/not-found.tsx",
    "apps/admin/app/forbidden/page.tsx",
  ];

  for (const filePath of routeStatePages) {
    if (!existsSync(path.join(ROOT_DIR, filePath))) {
      continue;
    }

    const content = readFile(filePath);
    if (!content.includes("RouteStateBlock")) {
      addFinding(findings, filePath, "路由状态页应复用 RouteStateBlock");
    }
  }
}

function main() {
  const findings = [];

  for (const filePath of listTrackedAdminFiles()) {
    const content = readFile(filePath);
    checkForbiddenContent(findings, filePath, content);
    checkAdminInformationHierarchy(findings, filePath, content);
    checkAdminComponents(findings, filePath, content);
    checkRouteErrorBoundaries(findings, filePath, content);
    checkHydrationSafeFormatting(findings, filePath, content);
    checkDialogA11y(findings, filePath, content);
    checkDialogFormFields(findings, filePath, content);
    checkExternalStoreHydration(findings, filePath, content);
  }

  checkRouteStatePages(findings);
  checkTableActionTrigger(findings);

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(finding);
    }
    throw new Error("后台 UI 规则校验失败");
  }

  console.log("[admin-ui] 后台 UI 规则校验通过");
}

main();
