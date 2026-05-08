import { appendFileSync } from "node:fs";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
} from "../lib/project-metadata.mjs";
import {
  RELEASE_EXECUTION_MODES,
  buildProjectProfile,
} from "../lib/project-profile.mjs";

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function resolveReleaseExecutionMode() {
  const mode = normalizeString(process.env.RTNN_RELEASE_EXECUTION_MODE);
  if (!mode) {
    return "";
  }

  if (!RELEASE_EXECUTION_MODES.includes(mode)) {
    throw new Error(
      `RTNN_RELEASE_EXECUTION_MODE 必须是 ${RELEASE_EXECUTION_MODES.join("/")}`,
    );
  }

  return mode;
}

function writeOutput(key, value) {
  const serialized = String(value ?? "");
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${serialized}\n`);
    return;
  }

  console.log(`${key}=${serialized}`);
}

function writeDisabled(reason) {
  writeOutput("enabled", "false");
  writeOutput("reason", reason);
  writeOutput("release_execution_mode", "");
  writeOutput("service_matrix", JSON.stringify({ service: [] }));
  writeOutput("enabled_services_json", JSON.stringify([]));
}

function resolveVersion(mode) {
  if (mode !== "release-images") {
    return {
      deployEnvironment: "",
      version: "",
    };
  }

  const githubRef = normalizeString(process.env.GITHUB_REF);
  const githubRefName = normalizeString(process.env.GITHUB_REF_NAME);
  const githubSha = normalizeString(process.env.GITHUB_SHA);
  const shortSha = githubSha.slice(0, 12);

  if (githubRef === "refs/heads/main") {
    return {
      deployEnvironment: "testing",
      version: `main-${shortSha}`,
    };
  }

  return {
    deployEnvironment: "",
    version: githubRefName,
  };
}

function main() {
  const mode = process.argv.includes("--mode=promote")
    ? "promote"
    : "release-images";
  const metadata = readProjectMetadata(process.cwd());

  if (!metadata) {
    writeDisabled("missing-project-metadata");
    return;
  }

  const project = metadata.project ?? {};
  const deployment = metadata.deployment ?? {};
  const projectRole = normalizeString(project.role);

  if (projectRole !== "business-source") {
    writeDisabled("repo-role-disabled");
    return;
  }

  const requestedReleaseExecutionMode = resolveReleaseExecutionMode();
  const profile = buildProjectProfile(metadata, {
    releaseExecutionMode: requestedReleaseExecutionMode,
  });
  const releaseExecutionMode = profile.releaseExecution.effectiveMode;
  const enabledServices = profile.enabledImageTargets;
  const projectId = normalizeString(project.projectId);
  const imageNamePrefix = normalizeString(
    deployment.imageNamePrefix,
    projectId,
  );
  const deployApplication = normalizeString(deployment.application, projectId);
  const deployEventType = normalizeString(deployment.dispatchEventType);
  const deployRepo = normalizeString(deployment.repo);
  const { deployEnvironment, version } = resolveVersion(mode);

  if (!projectId) {
    throw new Error(`${PROJECT_METADATA_FILE} 缺少 project.projectId`);
  }

  if (!imageNamePrefix) {
    throw new Error(`${PROJECT_METADATA_FILE} 缺少 deployment.imageNamePrefix`);
  }

  if (!deployApplication) {
    throw new Error(`${PROJECT_METADATA_FILE} 缺少 deployment.application`);
  }

  if (!deployEventType) {
    throw new Error(`${PROJECT_METADATA_FILE} 缺少 deployment.dispatchEventType`);
  }

  if (enabledServices.length === 0) {
    throw new Error("project profile 未启用任何镜像交付目标");
  }

  for (const warning of profile.warnings) {
    console.warn(`[release-context] ${warning}`);
  }

  writeOutput("enabled", "true");
  writeOutput("reason", "business-source");
  writeOutput("release_execution_mode", releaseExecutionMode);
  writeOutput("project_id", projectId);
  writeOutput("image_name_prefix", imageNamePrefix);
  writeOutput("deploy_application", deployApplication);
  writeOutput("deploy_event_type", deployEventType);
  writeOutput("deploy_repo", deployRepo);
  writeOutput("deploy_environment", deployEnvironment);
  writeOutput("version", version);
  writeOutput("service_matrix", JSON.stringify({ service: enabledServices }));
  writeOutput("enabled_services_json", JSON.stringify(enabledServices));
}

main();
