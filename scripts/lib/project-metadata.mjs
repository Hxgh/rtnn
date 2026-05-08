import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveTemplateEnv } from "./template-env.mjs";

export const PROJECT_METADATA_FILE = ".rtnn/project.json";
export const RELEASE_EXECUTION_MODES = Object.freeze([
  "server-local",
  "github-hosted",
]);

const CLIENT_RELEASE_TARGETS = Object.freeze([
  "android",
  "macos",
  "windows",
  "ios",
]);

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

function defaultReleaseExecution() {
  return {
    defaultMode: "server-local",
    allowedModes: ["server-local", "github-hosted"],
    githubHosted: {
      enabled: false,
      requiresExplicitOptIn: true,
    },
    clientBuild: {
      defaultTrigger: "manual",
      targets: {
        android: {
          enabled: true,
          defaultMode: "server-local",
        },
        macos: {
          enabled: false,
          defaultMode: "github-hosted",
        },
        windows: {
          enabled: false,
          defaultMode: "github-hosted",
        },
        ios: {
          enabled: false,
          defaultMode: "github-hosted",
        },
      },
    },
  };
}

function mergeReleaseExecution(existingReleaseExecution) {
  const defaults = defaultReleaseExecution();
  if (!isPlainObject(existingReleaseExecution)) {
    return defaults;
  }

  const existingGithubHosted = isPlainObject(existingReleaseExecution.githubHosted)
    ? existingReleaseExecution.githubHosted
    : {};
  const existingClientBuild = isPlainObject(existingReleaseExecution.clientBuild)
    ? existingReleaseExecution.clientBuild
    : {};
  const existingClientBuildTargets = isPlainObject(existingClientBuild.targets)
    ? existingClientBuild.targets
    : {};
  const targets = {};

  for (const target of CLIENT_RELEASE_TARGETS) {
    targets[target] = {
      ...defaults.clientBuild.targets[target],
      ...(isPlainObject(existingClientBuildTargets[target])
        ? existingClientBuildTargets[target]
        : {}),
    };
  }

  return {
    ...defaults,
    ...existingReleaseExecution,
    allowedModes: Array.isArray(existingReleaseExecution.allowedModes)
      ? existingReleaseExecution.allowedModes
      : defaults.allowedModes,
    githubHosted: {
      ...defaults.githubHosted,
      ...existingGithubHosted,
    },
    clientBuild: {
      ...defaults.clientBuild,
      ...existingClientBuild,
      targets,
    },
  };
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
  const deploymentApplication = normalizeRepository(
    existingDeployment.application,
    projectId,
  );

  const nextMetadata = {
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
      application: deploymentApplication,
      imageNamePrefix: normalizeRepository(
        existingDeployment.imageNamePrefix,
        imageNamePrefix,
      ),
      dispatchEventType: normalizeRepository(
        existingDeployment.dispatchEventType,
        dispatchEventType,
      ),
      clientReleaseFactsEventType: normalizeRepository(
        existingDeployment.clientReleaseFactsEventType,
        `sync-${deploymentApplication}-client-release-facts`,
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
    releaseExecution: mergeReleaseExecution(existing.releaseExecution),
    liveState: isPlainObject(existing.liveState)
      ? existing.liveState
      : { testing: {}, production: {} },
  };

  if (isPlainObject(existing.delivery)) {
    nextMetadata.delivery = existing.delivery;
  }

  return nextMetadata;
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
  const releaseExecution = isPlainObject(metadata.releaseExecution)
    ? metadata.releaseExecution
    : null;

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

  if (releaseExecution) {
    const allowedModes = Array.isArray(releaseExecution.allowedModes)
      ? releaseExecution.allowedModes
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
      : [];
    const defaultMode = String(releaseExecution.defaultMode ?? "").trim();

    if (!RELEASE_EXECUTION_MODES.includes(defaultMode)) {
      errors.push(
        `releaseExecution.defaultMode 必须是 ${RELEASE_EXECUTION_MODES.join("/")}`,
      );
    }

    if (allowedModes.length === 0) {
      errors.push("releaseExecution.allowedModes 不能为空");
    }

    for (const mode of allowedModes) {
      if (!RELEASE_EXECUTION_MODES.includes(mode)) {
        errors.push(`releaseExecution.allowedModes 包含未知模式: ${mode}`);
      }
    }

    if (defaultMode && allowedModes.length > 0 && !allowedModes.includes(defaultMode)) {
      errors.push("releaseExecution.defaultMode 必须包含在 allowedModes 中");
    }

    const githubHosted = isPlainObject(releaseExecution.githubHosted)
      ? releaseExecution.githubHosted
      : {};
    for (const [field, value] of [
      ["releaseExecution.githubHosted.enabled", githubHosted.enabled],
      [
        "releaseExecution.githubHosted.requiresExplicitOptIn",
        githubHosted.requiresExplicitOptIn,
      ],
    ]) {
      if (value !== undefined && typeof value !== "boolean") {
        errors.push(`${field} 必须是 boolean`);
      }
    }

    const clientBuild = isPlainObject(releaseExecution.clientBuild)
      ? releaseExecution.clientBuild
      : {};
    const clientBuildTargets = isPlainObject(clientBuild.targets)
      ? clientBuild.targets
      : {};
    for (const [target, targetConfig] of Object.entries(clientBuildTargets)) {
      if (!CLIENT_RELEASE_TARGETS.includes(target)) {
        errors.push(`releaseExecution.clientBuild.targets 包含未知目标: ${target}`);
        continue;
      }

      if (!isPlainObject(targetConfig)) {
        errors.push(`releaseExecution.clientBuild.targets.${target} 必须是对象`);
        continue;
      }

      if (
        targetConfig.enabled !== undefined &&
        typeof targetConfig.enabled !== "boolean"
      ) {
        errors.push(
          `releaseExecution.clientBuild.targets.${target}.enabled 必须是 boolean`,
        );
      }

      const targetDefaultMode = String(targetConfig.defaultMode ?? "").trim();
      if (
        targetDefaultMode &&
        !RELEASE_EXECUTION_MODES.includes(targetDefaultMode)
      ) {
        errors.push(
          `releaseExecution.clientBuild.targets.${target}.defaultMode 必须是 ${RELEASE_EXECUTION_MODES.join("/")}`,
        );
      }
    }
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
