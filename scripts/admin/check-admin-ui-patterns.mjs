import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");

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
      pattern: /\bRTNN App\b/,
      message: "用户可见名称不应回退为 RTNN App",
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
    checkAdminComponents(findings, filePath, content);
    checkRouteErrorBoundaries(findings, filePath, content);
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
