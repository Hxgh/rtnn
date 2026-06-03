import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

export const RUNTIME_FACTS_SCHEMA_VERSION =
  "rtnn.deploy.runtime-facts.v1";
export const CLIENT_RELEASE_MANIFEST_SCHEMA_VERSION =
  "rtnn.client-release.v1";

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|authorization|cookie|database_?url|connection_?string|ssh/i;

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObject(value[key])]),
  );
}

export function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

export function normalizeMetadataWithoutLiveState(metadata) {
  if (!isPlainObject(metadata)) {
    return metadata;
  }

  const normalized = { ...metadata };
  delete normalized.liveState;
  return normalized;
}

export function isMetadataLiveStateOnlyChange(beforeMetadata, afterMetadata) {
  return (
    stableStringify(normalizeMetadataWithoutLiveState(beforeMetadata)) ===
    stableStringify(normalizeMetadataWithoutLiveState(afterMetadata))
  );
}

export function readRuntimeFacts(factsFile) {
  const report = readJsonFile(factsFile);

  if (report.schemaVersion !== RUNTIME_FACTS_SCHEMA_VERSION) {
    throw new Error("runtime facts schemaVersion 不匹配");
  }

  if (!Array.isArray(report.environments)) {
    throw new Error("runtime facts 缺少 environments 数组");
  }

  return report;
}

function collectSensitiveKeyPaths(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectSensitiveKeyPaths(item, `${prefix}[${index}]`),
    );
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      paths.push(nextPath);
      continue;
    }
    paths.push(...collectSensitiveKeyPaths(child, nextPath));
  }
  return paths;
}

export function assertRuntimeFactsSafe(report) {
  const sensitivePaths = collectSensitiveKeyPaths(report);
  if (sensitivePaths.length > 0) {
    throw new Error(
      `runtime facts 包含疑似敏感字段: ${sensitivePaths.join(", ")}`,
    );
  }
}

export function assertRuntimeBindingMatches(metadata, report) {
  const errors = [];
  const binding = isPlainObject(report.binding) ? report.binding : {};
  const expected = {
    sourceRepository: metadata.project.repo,
    application: metadata.deployment.application,
    imageNamePrefix: metadata.deployment.imageNamePrefix,
    dispatchEventType: metadata.deployment.dispatchEventType,
  };

  for (const [key, value] of Object.entries(expected)) {
    if (binding[key] !== value) {
      errors.push(`${key}: ${value} != ${binding[key] ?? "(missing)"}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`runtime facts 绑定关系不匹配: ${errors.join("；")}`);
  }
}

export function selectRuntimeEnvironmentFacts(report, requestedEnvironments) {
  const factsByEnvironment = new Map(
    report.environments.map((environmentFact) => [
      environmentFact.environment,
      environmentFact,
    ]),
  );
  const environments =
    requestedEnvironments.length > 0
      ? requestedEnvironments
      : report.environments.map((environmentFact) => environmentFact.environment);

  return environments.map((environment) => {
    const environmentFact = factsByEnvironment.get(environment);
    if (!environmentFact) {
      throw new Error(`runtime facts 缺少环境: ${environment}`);
    }
    return environmentFact;
  });
}

export function readObservedRuntimeVersion(environmentFact) {
  const versionResult = environmentFact.health?.results?.version;
  const body = versionResult?.body;

  if (!versionResult?.ok || !isPlainObject(body)) {
    return {
      deployVersion: "",
      sourceSha: "",
    };
  }

  return {
    deployVersion: String(body.version ?? "").trim(),
    sourceSha: String(body.sourceSha ?? "").trim(),
  };
}

export function buildObservedRuntimeState(environmentFact) {
  const release = isPlainObject(environmentFact.release)
    ? environmentFact.release
    : {};
  const observedVersion = readObservedRuntimeVersion(environmentFact);
  const activeRelease =
    observedVersion.deployVersion || String(release.deployVersion ?? "").trim();
  const sourceSha =
    observedVersion.sourceSha || String(release.sourceSha ?? "").trim();

  return {
    activeRelease,
    sourceSha,
    health: {
      version: Boolean(environmentFact.health?.results?.version?.ok),
      readyz: Boolean(environmentFact.health?.results?.readyz?.ok),
      healthz: Boolean(environmentFact.health?.results?.healthz?.ok),
    },
  };
}

export function compareRuntimeEnvironment(metadata, environmentFact) {
  const environment = environmentFact.environment;
  const current = metadata.liveState?.[environment] ?? {};
  const observed = buildObservedRuntimeState(environmentFact);
  const mismatches = [];

  if (!observed.activeRelease) {
    mismatches.push({
      field: "activeRelease",
      expected: current.activeRelease ?? "",
      actual: "",
      reason: "runtime facts 缺少可识别 DEPLOY_VERSION 或 /version.version",
    });
  } else if (current.activeRelease !== observed.activeRelease) {
    mismatches.push({
      field: "activeRelease",
      expected: current.activeRelease ?? "",
      actual: observed.activeRelease,
    });
  }

  if (observed.sourceSha && current.sourceSha !== observed.sourceSha) {
    mismatches.push({
      field: "sourceSha",
      expected: current.sourceSha ?? "",
      actual: observed.sourceSha,
    });
  }

  return {
    environment,
    fresh: mismatches.length === 0,
    current: {
      activeRelease: current.activeRelease ?? "",
      sourceSha: current.sourceSha ?? "",
    },
    observed,
    mismatches,
  };
}

export function compareRuntimeLiveState(
  metadata,
  report,
  requestedEnvironments = [],
) {
  return selectRuntimeEnvironmentFacts(report, requestedEnvironments).map(
    (environmentFact) => compareRuntimeEnvironment(metadata, environmentFact),
  );
}

export function buildDesiredRuntimeLiveState(environmentFact) {
  const release = isPlainObject(environmentFact.release)
    ? environmentFact.release
    : {};
  const observedVersion = readObservedRuntimeVersion(environmentFact);
  const deployVersion =
    observedVersion.deployVersion || String(release.deployVersion ?? "").trim();
  const sourceSha =
    observedVersion.sourceSha || String(release.sourceSha ?? "").trim();

  if (!environmentFact.source?.exists && !observedVersion.deployVersion) {
    throw new Error(`${environmentFact.environment} 缺少可用 runtime source`);
  }

  if (!deployVersion) {
    throw new Error(`${environmentFact.environment} 缺少 DEPLOY_VERSION`);
  }

  return {
    activeRelease: deployVersion,
    ...(sourceSha ? { sourceSha } : {}),
  };
}

export function diffRuntimeLiveState(current, desired) {
  const changes = [];

  for (const [key, value] of Object.entries(desired)) {
    if (current?.[key] !== value) {
      changes.push({ key, before: current?.[key] ?? "", after: value });
    }
  }

  return changes;
}

export function collectRuntimeLiveStateChanges(
  metadata,
  report,
  requestedEnvironments = [],
) {
  return selectRuntimeEnvironmentFacts(report, requestedEnvironments).map(
    (environmentFact) => {
      const desired = buildDesiredRuntimeLiveState(environmentFact);
      const current = metadata.liveState?.[environmentFact.environment] ?? {};
      const changes = diffRuntimeLiveState(current, desired);

      return {
        environment: environmentFact.environment,
        desired,
        current,
        changes,
      };
    },
  );
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => path.join(dir, fileName));
}

function readReleaseManifests(artifactsDir) {
  const manifests = listJsonFiles(artifactsDir)
    .map(readJsonFile)
    .filter((item) => item.schemaVersion === CLIENT_RELEASE_MANIFEST_SCHEMA_VERSION);

  if (manifests.length === 0) {
    throw new Error("客户端 release artifacts 缺少 rtnn.client-release.v1 manifest");
  }

  return manifests;
}

function readNamedReports(artifactsDir, subdir, schemaVersion) {
  const reports = new Map();
  for (const report of listJsonFiles(path.join(artifactsDir, subdir)).map(
    readJsonFile,
  )) {
    if (report.schemaVersion === schemaVersion) {
      reports.set(report.artifactName, report);
    }
  }

  return reports;
}

function readUpdaterIndex(artifactsDir) {
  const indexPath = path.join(artifactsDir, "updater", "index.json");
  if (!existsSync(indexPath)) {
    return new Map();
  }

  const index = readJsonFile(indexPath);
  if (index.schemaVersion !== "rtnn.tauri-updater-index.v1") {
    return new Map();
  }

  return new Map(
    index.manifests.map((item) => [
      item.shell,
      {
        file: item.file,
        version: item.version,
        platforms: item.platforms,
      },
    ]),
  );
}

export function buildDesiredClientLiveState(
  manifests,
  mobileReports,
  desktopSigningReports,
  googlePlayReports,
  appStoreConnectReports,
  updaterByShell,
) {
  const clients = {};

  for (const manifest of manifests) {
    const clientState = clients[manifest.client] ?? {};
    const targetState = {
      releaseVersion: manifest.releaseVersion,
      shellVersion: manifest.shellVersion,
      channel: manifest.channel,
      releaseKind: manifest.releaseKind,
      sourceSha: manifest.sourceSha,
      sourceRef: manifest.sourceRef,
      artifactName: manifest.artifactName,
      webUrl: manifest.webUrl,
    };
    const updater = updaterByShell.get(manifest.shell);
    const mobileReport = mobileReports.get(manifest.artifactName);
    const desktopSigningReport = desktopSigningReports.get(manifest.artifactName);
    const googlePlayReport = googlePlayReports.get(manifest.artifactName);
    const appStoreConnectReport = appStoreConnectReports.get(
      manifest.artifactName,
    );

    if (updater && updater.version === manifest.releaseVersion) {
      targetState.updater = updater;
    }

    if (desktopSigningReport) {
      targetState.desktop = {
        status: desktopSigningReport.status,
        signingConfigured: Boolean(desktopSigningReport.signing?.configured),
        updaterConfigured: Boolean(desktopSigningReport.updater?.configured),
        updaterEndpoint:
          desktopSigningReport.updater?.endpoint || undefined,
        blockers: desktopSigningReport.blockers ?? [],
      };
    }

    if (mobileReport) {
      targetState.mobile = {
        status: mobileReport.status,
        buildStatus: mobileReport.build?.status,
        buildImplemented: Boolean(mobileReport.build?.implemented),
        buildArtifactDir: mobileReport.build?.artifactDir || undefined,
        artifactType: mobileReport.policy?.artifactType,
        storeProvider: mobileReport.policy?.store?.provider,
        blockers: mobileReport.policy?.blockers ?? [],
      };
    }

    if (googlePlayReport) {
      targetState.mobile = {
        ...(targetState.mobile ?? {}),
        storeRelease: {
          provider: "google-play",
          status: googlePlayReport.status,
          track: googlePlayReport.track,
          releaseStatus: googlePlayReport.releaseStatus,
          packageName: googlePlayReport.packageName,
          releaseFileName: googlePlayReport.releaseFileName,
          committedEditId: googlePlayReport.committedEditId || undefined,
          reason: googlePlayReport.reason || undefined,
        },
      };
    }

    if (appStoreConnectReport) {
      targetState.mobile = {
        ...(targetState.mobile ?? {}),
        storeRelease: {
          provider: "app-store-connect",
          status: appStoreConnectReport.status,
          distribution: appStoreConnectReport.distribution,
          bundleId: appStoreConnectReport.bundleId,
          ipaFileName: appStoreConnectReport.ipaFileName,
          reason: appStoreConnectReport.reason || undefined,
        },
      };
    }

    clientState[manifest.target] = targetState;
    clients[manifest.client] = clientState;
  }

  return clients;
}

export function readClientReleaseFacts(artifactsDir) {
  const manifests = readReleaseManifests(artifactsDir);
  const mobileReports = readNamedReports(
    artifactsDir,
    "mobile-boundary",
    "rtnn.mobile-release-boundary.v1",
  );
  const desktopSigningReports = readNamedReports(
    artifactsDir,
    "desktop-signing",
    "rtnn.desktop-signing-boundary.v1",
  );
  const googlePlayReports = readNamedReports(
    artifactsDir,
    "google-play",
    "rtnn.google-play-release.v1",
  );
  const appStoreConnectReports = readNamedReports(
    artifactsDir,
    "app-store-connect",
    "rtnn.app-store-connect-release.v1",
  );
  const updaterByShell = readUpdaterIndex(artifactsDir);
  const desiredClients = buildDesiredClientLiveState(
    manifests,
    mobileReports,
    desktopSigningReports,
    googlePlayReports,
    appStoreConnectReports,
    updaterByShell,
  );

  return {
    manifests,
    mobileReports,
    desktopSigningReports,
    googlePlayReports,
    appStoreConnectReports,
    updaterByShell,
    desiredClients,
  };
}

export function diffClientLiveState(currentClients, desiredClients) {
  const changes = [];

  for (const [client, targets] of Object.entries(desiredClients)) {
    for (const [target, desired] of Object.entries(targets)) {
      const current = currentClients?.[client]?.[target] ?? null;
      if (stableStringify(current) !== stableStringify(desired)) {
        changes.push({ client, target, before: current, after: desired });
      }
    }
  }

  return changes;
}

export function compareClientLiveState(metadata, artifactsDir, environment) {
  const facts = readClientReleaseFacts(artifactsDir);
  const currentEnvironment = metadata.liveState?.[environment] ?? {};
  const currentClients = currentEnvironment.clients ?? {};
  const changes = diffClientLiveState(
    currentClients,
    facts.desiredClients,
  );

  return {
    ok: changes.length === 0,
    environment,
    artifactsDir,
    changeCount: changes.length,
    changes,
    desiredClients: facts.desiredClients,
    currentEnvironment,
    currentClients,
  };
}
