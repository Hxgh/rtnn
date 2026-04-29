#!/usr/bin/env node

import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
  writeProjectMetadata,
} from "../lib/project-metadata.mjs";

function usage() {
  return `用法:
  node scripts/release/sync-client-release-state.mjs --artifacts-dir <client-release-dir> --environment <name> [--check|--write]

选项:
  --artifacts-dir <dir>      release-clients workflow 产出的 artifacts/client-release 目录
  --environment <name>       写入 liveState 的环境，例如 testing 或 production
  --check                    只校验 liveState 是否与客户端 release facts 一致，默认行为
  --write                    写回 .rtnn/project.json 的 liveState
`;
}

function parseArgs(argv) {
  const args = {
    artifactsDir: "",
    environment: "",
    mode: "check",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--artifacts-dir":
        args.artifactsDir = argv[++index] ?? "";
        break;
      case "--environment":
        args.environment = argv[++index] ?? "";
        break;
      case "--check":
        args.mode = "check";
        break;
      case "--write":
        args.mode = "write";
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`未知参数: ${item}`);
    }
  }

  args.artifactsDir = String(args.artifactsDir).trim();
  args.environment = String(args.environment).trim();

  if (!args.artifactsDir) {
    throw new Error("必须传入 --artifacts-dir");
  }

  if (!args.environment) {
    throw new Error("必须传入 --environment");
  }

  if (!existsSync(args.artifactsDir)) {
    throw new Error(`客户端 release artifacts 目录不存在: ${args.artifactsDir}`);
  }

  return args;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
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
    .map(readJson)
    .filter((item) => item.schemaVersion === "rtnn.client-release.v1");

  if (manifests.length === 0) {
    throw new Error("客户端 release artifacts 缺少 rtnn.client-release.v1 manifest");
  }

  return manifests;
}

function readMobileBoundaryReports(artifactsDir) {
  const reports = new Map();
  for (const report of listJsonFiles(path.join(artifactsDir, "mobile-boundary")).map(readJson)) {
    if (report.schemaVersion === "rtnn.mobile-release-boundary.v1") {
      reports.set(report.artifactName, report);
    }
  }

  return reports;
}

function readDesktopSigningReports(artifactsDir) {
  const reports = new Map();
  for (const report of listJsonFiles(path.join(artifactsDir, "desktop-signing")).map(readJson)) {
    if (report.schemaVersion === "rtnn.desktop-signing-boundary.v1") {
      reports.set(report.artifactName, report);
    }
  }

  return reports;
}

function readGooglePlayReports(artifactsDir) {
  const reports = new Map();
  for (const report of listJsonFiles(path.join(artifactsDir, "google-play")).map(readJson)) {
    if (report.schemaVersion === "rtnn.google-play-release.v1") {
      reports.set(report.artifactName, report);
    }
  }

  return reports;
}

function readAppStoreConnectReports(artifactsDir) {
  const reports = new Map();
  for (const report of listJsonFiles(path.join(artifactsDir, "app-store-connect")).map(readJson)) {
    if (report.schemaVersion === "rtnn.app-store-connect-release.v1") {
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

  const index = readJson(indexPath);
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

function sortObject(value) {
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

function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

function buildDesiredState(
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
    const appStoreConnectReport = appStoreConnectReports.get(manifest.artifactName);

    if (updater && updater.version === manifest.releaseVersion) {
      targetState.updater = updater;
    }

    if (desktopSigningReport) {
      targetState.desktop = {
        status: desktopSigningReport.status,
        signingConfigured: Boolean(
          desktopSigningReport.signing?.configured,
        ),
        updaterConfigured: Boolean(
          desktopSigningReport.updater?.configured,
        ),
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

function diffClientState(currentClients, desiredClients) {
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const metadata = readProjectMetadata(rootDir);

  if (!metadata) {
    throw new Error(`缺少项目事实文件: ${path.join(rootDir, PROJECT_METADATA_FILE)}`);
  }

  if (metadata.project?.role !== "business-source") {
    throw new Error("project.role 必须是 business-source");
  }

  const artifactsDir = path.resolve(rootDir, args.artifactsDir);
  const manifests = readReleaseManifests(artifactsDir);
  const mobileReports = readMobileBoundaryReports(artifactsDir);
  const desktopSigningReports = readDesktopSigningReports(artifactsDir);
  const googlePlayReports = readGooglePlayReports(artifactsDir);
  const appStoreConnectReports = readAppStoreConnectReports(artifactsDir);
  const updaterByShell = readUpdaterIndex(artifactsDir);
  const desiredClients = buildDesiredState(
    manifests,
    mobileReports,
    desktopSigningReports,
    googlePlayReports,
    appStoreConnectReports,
    updaterByShell,
  );
  const nextMetadata = readProjectMetadata(rootDir);
  const currentEnvironment =
    nextMetadata.liveState?.[args.environment] ?? {};
  const currentClients = currentEnvironment.clients ?? {};
  const changes = diffClientState(currentClients, desiredClients);

  if (changes.length === 0) {
    console.log("[client-live-state] .rtnn/project.json 已与客户端 release facts 一致");
    return;
  }

  for (const change of changes) {
    console.log(
      `[client-live-state] ${args.environment}.clients.${change.client}.${change.target} 需要更新`,
    );
  }

  if (args.mode === "check") {
    throw new Error("客户端 liveState 与 release facts 不一致；确认后使用 --write 写回");
  }

  nextMetadata.liveState = nextMetadata.liveState ?? {};
  nextMetadata.liveState[args.environment] = {
    ...currentEnvironment,
    clients: {
      ...currentClients,
      ...Object.fromEntries(
        Object.entries(desiredClients).map(([client, targets]) => [
          client,
          {
            ...(currentClients[client] ?? {}),
            ...targets,
          },
        ]),
      ),
    },
  };

  const metadataPath = writeProjectMetadata(rootDir, nextMetadata);
  console.log(`[client-live-state] 已更新 ${metadataPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
