import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveTemplateEnv } from "./template-env.mjs";

export const PROJECT_METADATA_FILE = ".rtnn/project.json";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseGitHubRepository(remoteUrl) {
  const normalized = String(remoteUrl ?? "").trim();
  if (!normalized) {
    return "";
  }

  const match = normalized.match(
    /(?:git@github\.com:|https:\/\/github\.com\/)([^/]+\/[^/.]+)(?:\.git)?$/,
  );

  return match?.[1] ?? "";
}

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolveRemoteRepository(rootDir, remoteName) {
  const result = spawnSync("git", ["remote", "get-url", remoteName], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    return "";
  }

  return parseGitHubRepository(result.stdout.trim());
}

function normalizeRepository(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeEnvironments(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return ["testing", "production"];
  }

  const normalized = value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : ["testing", "production"];
}

export function readProjectMetadata(rootDir) {
  const metadataPath = path.join(rootDir, PROJECT_METADATA_FILE);
  if (!existsSync(metadataPath)) {
    return null;
  }

  return readJsonFile(metadataPath);
}

export function buildBusinessProjectMetadata(rootDir, existingMetadata = null) {
  const templateEnv = resolveTemplateEnv(rootDir);
  const projectId = templateEnv.TEMPLATE_PROJECT_ID;
  const brandName = templateEnv.TEMPLATE_BRAND_NAME;
  const cookiePrefix = templateEnv.TEMPLATE_COOKIE_PREFIX;
  const imageNamePrefix = templateEnv.TEMPLATE_IMAGE_NAME_PREFIX ?? projectId;
  const dispatchEventType =
    templateEnv.TEMPLATE_DEPLOY_EVENT_TYPE ?? `promote-${projectId}`;

  const existing = isPlainObject(existingMetadata) ? existingMetadata : {};
  const existingProject = isPlainObject(existing.project) ? existing.project : {};
  const existingUpstream = isPlainObject(existing.upstreamTemplate)
    ? existing.upstreamTemplate
    : {};
  const existingDeployment = isPlainObject(existing.deployment)
    ? existing.deployment
    : {};

  const originRepository =
    normalizeRepository(existingProject.repo, "") ||
    resolveRemoteRepository(rootDir, "origin") ||
    `example/${projectId}-source`;
  const upstreamRepository =
    normalizeRepository(existingUpstream.repo, "") ||
    resolveRemoteRepository(rootDir, "upstream");
  const deploymentRepository =
    normalizeRepository(existingDeployment.repo, "") ||
    `example/${projectId}-deploy`;

  return {
    version: "v1",
    project: {
      repo: originRepository,
      role: normalizeRepository(existingProject.role, "business-source"),
      projectId,
      brandName,
      cookiePrefix,
    },
    upstreamTemplate: {
      repo: upstreamRepository,
      remote: normalizeRepository(existingUpstream.remote, "upstream"),
      defaultRef: normalizeRepository(existingUpstream.defaultRef, "main"),
      syncStrategy: normalizeRepository(
        existingUpstream.syncStrategy,
        "git-merge-from-upstream",
      ),
    },
    deployment: {
      repo: deploymentRepository,
      application: normalizeRepository(existingDeployment.application, projectId),
      imageNamePrefix: normalizeRepository(
        existingDeployment.imageNamePrefix,
        imageNamePrefix,
      ),
      dispatchEventType: normalizeRepository(
        existingDeployment.dispatchEventType,
        dispatchEventType,
      ),
      environments: normalizeEnvironments(existingDeployment.environments),
      testingTrigger: normalizeRepository(
        existingDeployment.testingTrigger,
        "business-repo-main",
      ),
      productionTrigger: normalizeRepository(
        existingDeployment.productionTrigger,
        "business-repo-manual-promote",
      ),
    },
    domains: isPlainObject(existing.domains)
      ? existing.domains
      : { testing: {}, production: {} },
    server: isPlainObject(existing.server)
      ? existing.server
      : { hostModel: "single-host" },
    liveState: isPlainObject(existing.liveState)
      ? existing.liveState
      : { testing: {}, production: {} },
  };
}

export function writeProjectMetadata(rootDir, metadata) {
  const metadataPath = path.join(rootDir, PROJECT_METADATA_FILE);
  mkdirSync(path.dirname(metadataPath), { recursive: true });
  const serialized = `${JSON.stringify(metadata, null, 2)}\n`;
  writeFileSync(metadataPath, serialized);
  return metadataPath;
}

export function syncBusinessProjectMetadata(rootDir) {
  const existingMetadata = readProjectMetadata(rootDir);
  const nextMetadata = buildBusinessProjectMetadata(rootDir, existingMetadata);
  const metadataPath = path.join(rootDir, PROJECT_METADATA_FILE);
  const serialized = `${JSON.stringify(nextMetadata, null, 2)}\n`;
  const changed =
    !existsSync(metadataPath) ||
    readFileSync(metadataPath, "utf8") !== serialized;

  if (changed) {
    writeProjectMetadata(rootDir, nextMetadata);
  }

  return {
    changed,
    metadata: nextMetadata,
    metadataPath,
    serialized,
  };
}

export function validateBusinessProjectMetadata(rootDir, options = {}) {
  const { requireConcreteRepositories = false } = options;
  const metadata = readProjectMetadata(rootDir);
  const metadataPath = path.join(rootDir, PROJECT_METADATA_FILE);

  if (!metadata) {
    throw new Error(`缺少项目事实文件: ${metadataPath}`);
  }

  const errors = [];
  const project = isPlainObject(metadata.project) ? metadata.project : {};
  const upstreamTemplate = isPlainObject(metadata.upstreamTemplate)
    ? metadata.upstreamTemplate
    : {};
  const deployment = isPlainObject(metadata.deployment) ? metadata.deployment : {};

  const requiredFields = [
    ["project.repo", project.repo],
    ["project.role", project.role],
    ["project.projectId", project.projectId],
    ["project.brandName", project.brandName],
    ["project.cookiePrefix", project.cookiePrefix],
    ["deployment.repo", deployment.repo],
    ["deployment.application", deployment.application],
    ["deployment.imageNamePrefix", deployment.imageNamePrefix],
    ["deployment.dispatchEventType", deployment.dispatchEventType],
  ];

  for (const [field, value] of requiredFields) {
    if (!String(value ?? "").trim()) {
      errors.push(`${field} 不能为空`);
    }
  }

  if (project.role !== "business-source") {
    errors.push("project.role 必须是 business-source");
  }

  const environments = normalizeEnvironments(deployment.environments);
  if (!environments.includes("testing") || !environments.includes("production")) {
    errors.push("deployment.environments 必须同时包含 testing 和 production");
  }

  if (!String(upstreamTemplate.repo ?? "").trim()) {
    errors.push("upstreamTemplate.repo 不能为空");
  }

  if (requireConcreteRepositories) {
    for (const [field, value] of [
      ["project.repo", project.repo],
      ["upstreamTemplate.repo", upstreamTemplate.repo],
      ["deployment.repo", deployment.repo],
    ]) {
      const normalized = String(value ?? "").trim();
      if (!normalized || normalized.startsWith("example/")) {
        errors.push(`${field} 不能保留 example/ 占位值`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("；"));
  }

  return metadata;
}
