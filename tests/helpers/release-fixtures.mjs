import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeTemplateEnv(cwd) {
  writeFileSync(
    path.join(cwd, ".env"),
    [
      "TEMPLATE_PROJECT_ID=acme",
      "TEMPLATE_BRAND_NAME=ACME",
      "TEMPLATE_COOKIE_PREFIX=acme",
      "TEMPLATE_IMAGE_NAME_PREFIX=acme",
      "TEMPLATE_DEPLOY_APPLICATION=acme",
      "TEMPLATE_DEPLOY_EVENT_TYPE=promote-acme",
      "",
    ].join("\n"),
  );
}

export function buildClientTarget() {
  return {
    releaseVersion: "1.2.3",
    shellVersion: "0.2.0",
    channel: "testing",
    releaseKind: "desktop-unsigned",
    sourceSha: "1234567890abcdef",
    sourceRef: "refs/tags/v1.2.3",
    artifactName: "admin-desktop-macos-1.2.3",
    webUrl: "https://admin.acme.test",
    updater: {
      file: "admin-desktop-latest.json",
      version: "1.2.3",
      platforms: ["darwin-aarch64"],
    },
    desktop: {
      status: "ready-for-signed-build",
      signingConfigured: true,
      updaterConfigured: true,
      updaterEndpoint:
        "https://github.com/acme/business-source/releases/latest/download/admin-desktop-latest.json",
      blockers: [],
    },
  };
}

export function writeProjectMetadata(
  cwd,
  {
    activeRelease = "main-abc123",
    sourceSha = "abc123",
    includeClientState = true,
  } = {},
) {
  writeJson(path.join(cwd, ".rtnn/project.json"), {
    version: "v1",
    project: {
      repo: "acme/business-source",
      role: "business-source",
      projectId: "acme",
      brandName: "ACME",
      cookiePrefix: "acme",
    },
    upstreamTemplate: {
      repo: "acme/rtnn",
      remote: "upstream",
      defaultRef: "main",
      syncStrategy: "git-merge-from-upstream",
    },
    deployment: {
      repo: "acme/rtnn-deploy",
      application: "acme",
      imageNamePrefix: "acme",
      dispatchEventType: "promote-acme",
      clientReleaseFactsEventType: "sync-acme-client-release-facts",
      environments: ["testing", "production"],
    },
    domains: {
      testing: {},
      production: {},
    },
    server: {
      hostModel: "single-host",
    },
    releaseExecution: {
      defaultMode: "github-hosted",
      allowedModes: ["github-hosted", "server-local"],
    },
    delivery: {
      services: {
        backend: { enabled: true },
        admin: { enabled: true },
        app: { enabled: false },
        weapp: { enabled: false },
      },
      clients: {
        adminDesktop: {
          enabled: true,
          targets: ["macos"],
          webUrl: "https://admin.acme.test",
          channel: "testing",
        },
      },
    },
    liveState: {
      testing: {
        activeRelease,
        sourceSha,
        clients: includeClientState
          ? {
              adminDesktop: {
                macos: buildClientTarget(),
              },
            }
          : {},
      },
      production: {},
    },
  });
}

export function writeRuntimeFacts(cwd, overrides = {}) {
  writeJson(path.join(cwd, "runtime-facts.json"), {
    schemaVersion: "rtnn.deploy.runtime-facts.v1",
    binding: {
      sourceRepository: "acme/business-source",
      application: "acme",
      imageNamePrefix: "acme",
      dispatchEventType: "promote-acme",
      ...(overrides.binding ?? {}),
    },
    environments: [
      {
        environment: "testing",
        source: {
          exists: true,
        },
        release: {
          deployVersion: "main-abc123",
          sourceSha: "abc123",
        },
        health: {
          results: {
            version: {
              ok: true,
              body: {
                version: "main-abc123",
                sourceSha: "abc123",
              },
            },
            readyz: {
              ok: true,
            },
            healthz: {
              ok: true,
            },
          },
        },
        ...(overrides.environment ?? {}),
      },
    ],
    ...(overrides.report ?? {}),
  });
}

export function writeClientArtifacts(cwd) {
  const artifactsDir = path.join(cwd, "artifacts/client-release");
  writeJson(path.join(artifactsDir, "admin-desktop-macos-1.2.3.json"), {
    schemaVersion: "rtnn.client-release.v1",
    client: "adminDesktop",
    target: "macos",
    shell: "admin-desktop",
    packageName: "@rtnn/admin-tauri",
    releaseVersion: "1.2.3",
    shellVersion: "0.2.0",
    channel: "testing",
    releaseKind: "desktop-unsigned",
    dryRun: false,
    webUrl: "https://admin.acme.test",
    sourceSha: "1234567890abcdef",
    sourceRef: "refs/tags/v1.2.3",
    artifactName: "admin-desktop-macos-1.2.3",
    generatedAt: "2026-04-29T00:00:00.000Z",
  });
  writeJson(path.join(artifactsDir, "updater/index.json"), {
    schemaVersion: "rtnn.tauri-updater-index.v1",
    manifests: [
      {
        shell: "admin-desktop",
        file: "admin-desktop-latest.json",
        version: "1.2.3",
        platforms: ["darwin-aarch64"],
      },
    ],
  });
  writeJson(
    path.join(
      artifactsDir,
      "desktop-signing/admin-desktop-macos-1.2.3.json",
    ),
    {
      schemaVersion: "rtnn.desktop-signing-boundary.v1",
      client: "adminDesktop",
      target: "macos",
      shell: "admin-desktop",
      releaseVersion: "1.2.3",
      channel: "testing",
      artifactName: "admin-desktop-macos-1.2.3",
      status: "ready-for-signed-build",
      signing: {
        configured: true,
      },
      updater: {
        configured: true,
        endpoint:
          "https://github.com/acme/business-source/releases/latest/download/admin-desktop-latest.json",
      },
      blockers: [],
    },
  );
  return artifactsDir;
}

export function writeDeployClientFacts(cwd, overrides = {}) {
  writeJson(path.join(cwd, "client-facts.json"), {
    schemaVersion: "rtnn.deploy.client-release-facts.v1",
    generatedAt: "2026-04-29T00:00:00.000Z",
    environment: "testing",
    mode: "write",
    project: {
      repo: "acme/rtnn-deploy",
      role: "deploy-executor",
      projectId: "acme",
    },
    binding: {
      sourceRepository: "acme/business-source",
      application: "acme",
      imageNamePrefix: "acme",
      clientReleaseFactsEventType: "sync-acme-client-release-facts",
    },
    source: {
      repository: "acme/business-source",
      runId: "12345",
      sourceSha: "1234567890abcdef",
      sourceRefs: ["refs/tags/v1.2.3"],
    },
    release: {
      versions: ["1.2.3"],
      dryRun: false,
    },
    artifacts: {
      downloadedDir: "artifacts/downloaded",
      manifestCount: 1,
    },
    clients: {
      adminDesktop: {
        macos: buildClientTarget(),
      },
    },
    ...overrides,
  });
}

export function writeReleaseProject(cwd, options = {}) {
  writeTemplateEnv(cwd);
  writeProjectMetadata(cwd, options);
  writeRuntimeFacts(cwd);
  const artifactsDir = writeClientArtifacts(cwd);
  writeDeployClientFacts(cwd);
  return artifactsDir;
}
