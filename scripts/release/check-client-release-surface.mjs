import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");

function read(filePath) {
  return readFileSync(path.join(ROOT_DIR, filePath), "utf8");
}

function addFinding(findings, filePath, message) {
  findings.push(`[client-release] ${filePath}: ${message}`);
}

function assertIncludes(findings, filePath, content, values, message) {
  for (const value of values) {
    if (!content.includes(value)) {
      addFinding(findings, filePath, `${message}: ${value}`);
    }
  }
}

function assertMatches(findings, filePath, content, checks) {
  for (const { pattern, message } of checks) {
    if (!pattern.test(content)) {
      addFinding(findings, filePath, message);
    }
  }
}

function assertNotMatches(findings, filePath, content, checks) {
  for (const { pattern, message } of checks) {
    if (pattern.test(content)) {
      addFinding(findings, filePath, message);
    }
  }
}

function checkWorkflow(findings) {
  const filePath = ".github/workflows/release-clients.yml";
  const content = read(filePath);

  assertIncludes(
    findings,
    filePath,
    content,
    [
      "workflow_dispatch:",
      '      - "client-*"',
      "default: github-hosted",
      "confirm_server_local_build:",
      "allow_server_android_build:",
      "CLIENT_RELEASE_CONFIRM_SERVER_LOCAL_BUILD",
      "CLIENT_RELEASE_ALLOW_SERVER_ANDROID_BUILD",
      "check-client-build-capacity.mjs",
      "with-client-build-lock.mjs",
      "cleanup-client-build-artifacts.mjs",
    ],
    "客户端发布 workflow 必须保持按需触发和服务器保护边界",
  );

  assertNotMatches(findings, filePath, content, [
    {
      pattern: /\n\s+branches:\s*\n\s+- main\b/,
      message: "release-clients 不应由 main push 触发",
    },
    {
      pattern: /-\s+"v\*"/,
      message: "release-clients 不应由 v* 业务发布 tag 触发",
    },
  ]);
}

function checkBackendContract(findings) {
  const filePath =
    "apps/backend/src/modules/client-releases/client-releases.controller.ts";
  const content = read(filePath);

  assertIncludes(
    findings,
    filePath,
    content,
    [
      "@Controller('client-downloads')",
      "@Get()",
      "@Get('latest')",
      "@Controller('client-updates')",
      "@Get('check')",
      "this.clientReleasesService.listDownloads(query)",
      "this.clientReleasesService.resolveDownload(query)",
      "this.clientReleasesService.checkUpdate(query)",
      "@Controller('admin/client-releases')",
      "@Get('packages')",
      "@Patch(':releaseId/policies/:policyId')",
    ],
    "客户端发布公开/后台接口契约不应缺失",
  );

  const servicePath =
    "apps/backend/src/modules/client-releases/client-releases.service.ts";
  const serviceContent = read(servicePath);
  assertIncludes(
    findings,
    servicePath,
    serviceContent,
    [
      "reason: 'disabled'",
      "reason: 'missing-package'",
      "'github-fallback-disabled'",
      "'missing-distribution-url'",
      "policy?.recommendedReleaseId",
      "minimumSupportedVersion",
      "forceUpdate",
      "allowGithubFallback",
      "downloadablePackageCount",
      "distributionStatus: { notIn: ['disabled', 'pruned'] }",
    ],
    "客户端发布策略语义不应丢失",
  );
}

function checkAdminSurface(findings) {
  const listPath = "apps/admin/app/(dashboard)/client-releases/page.tsx";
  const packagePath =
    "apps/admin/app/(dashboard)/client-releases/packages/page.tsx";
  const detailPath =
    "apps/admin/app/(dashboard)/client-releases/[id]/page.tsx";
  const actionPath = "apps/admin/app/(dashboard)/client-releases/actions.ts";

  for (const filePath of [listPath, packagePath, detailPath, actionPath]) {
    if (!existsSync(path.join(ROOT_DIR, filePath))) {
      addFinding(findings, filePath, "客户端发布后台页面/动作文件缺失");
    }
  }

  const listContent = read(listPath);
  assertIncludes(
    findings,
    listPath,
    listContent,
    [
      "dictionary.clientReleases.releaseVersion",
      "dictionary.clientReleases.channel",
      "dictionary.clientReleases.client",
      "dictionary.clientReleases.targets",
      "dictionary.clientReleases.distributionStatus",
      "dictionary.clientReleases.downloadable",
      "dictionary.clientReleases.syncedAt",
      "AdminTablePage",
      "emptyText={dictionary.clientReleases.empty}",
    ],
    "发布中心必须保留版本、渠道、客户端、平台、状态、可下载数和同步时间",
  );

  const packageContent = read(packagePath);
  assertIncludes(
    findings,
    packagePath,
    packageContent,
    [
      "formatClientPackageName(item.client, item.target, locale)",
      "dictionary.clientReleases.artifact",
      "dictionary.clientReleases.distributionStatus",
      "dictionary.clientReleases.provider",
      "dictionary.clientReleases.fileSize",
      "shortHash(item.sha256)",
      "dictionary.clientReleases.syncedAt",
      "item.distributionUrl",
      "item.sourceUrl",
      "emptyText={dictionary.clientReleases.empty}",
    ],
    "包列表必须保留文件、大小、SHA256、自托管地址、GitHub 来源、状态和同步时间",
  );

  const detailContent = read(detailPath);
  assertIncludes(
    findings,
    detailPath,
    detailContent,
    [
      "dictionary.clientReleases.generatedAt",
      "dictionary.clientReleases.syncedAt",
      "dictionary.clientReleases.distributionUrl",
      "dictionary.clientReleases.sourceUrl",
      "dictionary.clientReleases.blockers",
      "dictionary.clientReleases.recommendedVersion",
      "dictionary.clientReleases.minimumSupportedVersion",
      "dictionary.clientReleases.forceUpdate",
      "dictionary.clientReleases.allowGithubFallback",
      "dictionary.clientReleases.policySaved",
      "dictionary.clientReleases.policySaveFailed",
      "defaultValue={policy.recommendedReleaseId ?? \"\"}",
    ],
    "详情页必须保留包详情、错误原因、策略保存和推荐版本能力",
  );
}

function checkAppDownloadSurface(findings) {
  const filePath = "apps/app/app/(public)/download/page.tsx";
  const content = read(filePath);

  assertIncludes(
    findings,
    filePath,
    content,
    [
      "export const dynamic = \"force-dynamic\"",
      "resolveDefaultChannel",
      "listClientDownloads({ channel })",
      "messages.download.unavailable",
      "formatClientPackageName(info.client, info.target, locale)",
      "formatClientTarget(info.target)",
      "messages.download.version",
      "messages.download.channel",
      "messages.download.provider",
      "messages.download.file",
      "messages.download.fileSize",
      "messages.download.updatedAt",
      "messages.download.sha256",
      "messages.download.reason",
      "NativeDownloadButton",
      "info.syncedAt ?? info.generatedAt",
    ],
    "下载页必须保留渠道、空态、平台、更新时间、校验信息和下载按钮",
  );

  const buttonPath = "apps/app/components/download/native-download-button.tsx";
  const buttonContent = read(buttonPath);
  assertIncludes(
    findings,
    buttonPath,
    buttonContent,
    [
      "nativeCore.openExternalUrl(url)",
      "window.location.assign(url)",
      "document.visibilityState",
      "setOpening(false)",
      "failedLabel",
    ],
    "下载按钮必须保留壳打开、浏览器 fallback 和打开中状态恢复",
  );
}

function checkScriptWiring(findings) {
  const packageJsonPath = "package.json";
  const packageJson = JSON.parse(read(packageJsonPath));
  const checkClientRelease = packageJson.scripts?.["check:client-release"] ?? "";

  if (!checkClientRelease.includes("check-client-release-surface.mjs")) {
    addFinding(
      findings,
      packageJsonPath,
      "check:client-release 必须包含客户端发布闭环 surface 检查",
    );
  }
}

function main() {
  const findings = [];

  checkWorkflow(findings);
  checkBackendContract(findings);
  checkAdminSurface(findings);
  checkAppDownloadSurface(findings);
  checkScriptWiring(findings);

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(finding);
    }
    throw new Error("客户端发布闭环质量闸失败");
  }

  console.log("[client-release] 客户端发布闭环质量闸通过");
}

main();
