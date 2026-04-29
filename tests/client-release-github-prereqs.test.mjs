import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const scriptPath = path.join(
  repoRoot,
  "scripts/release/check-client-release-github-prereqs.mjs",
);

function withTempProject(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-client-gh-prereqs-"));
  try {
    mkdirSync(path.join(dir, ".rtnn"), { recursive: true });
    writeFileSync(
      path.join(dir, ".rtnn/project.json"),
      `${JSON.stringify(
        {
          project: {
            repo: "acme/business-source",
            projectId: "acme",
          },
          deployment: {
            repo: "acme/rtnn-deploy",
            application: "acme",
            clientReleaseFactsEventType: "sync-acme-client-release-facts",
          },
        },
        null,
        2,
      )}\n`,
    );
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeFakeGh(rootDir, script) {
  const binDir = path.join(rootDir, "bin");
  mkdirSync(binDir, { recursive: true });
  const ghPath = path.join(binDir, "gh");
  writeFileSync(ghPath, script);
  chmodSync(ghPath, 0o755);
  return binDir;
}

function runPrereqs(rootDir, binDir, extraArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, "--json", ...extraArgs], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    },
  });

  return {
    result,
    report: result.stdout ? JSON.parse(result.stdout) : null,
  };
}

test("client release GitHub prereqs reports gh auth blocker with next action", () => {
  withTempProject((rootDir) => {
    const binDir = writeFakeGh(
      rootDir,
      [
        "#!/bin/sh",
        "if [ \"$1\" = \"auth\" ] && [ \"$2\" = \"status\" ]; then",
        "  echo \"not logged in\" >&2",
        "  exit 1",
        "fi",
        "echo \"unexpected gh call: $*\" >&2",
        "exit 2",
        "",
      ].join("\n"),
    );

    const { result, report } = runPrereqs(rootDir, binDir);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(report.ok, false);
    assert.deepEqual(report.blocking, ["gh-not-authenticated"]);
    assert.equal(report.repositories.source, "acme/business-source");
    assert.equal(report.repositories.deploy, "acme/rtnn-deploy");
    assert.deepEqual(report.configuration.requiredSourceSecrets, [
      "DEPLOY_REPOSITORY_DISPATCH_TOKEN",
    ]);
    assert.deepEqual(report.configuration.requiredDeploySecrets, [
      "DEPLOY_SOURCE_REPOSITORY_TOKEN",
    ]);
    assert.match(report.nextActions.join("\n"), /gh auth login/);
  });
});

test("client release GitHub prereqs reports ready state and optional variable guidance", () => {
  withTempProject((rootDir) => {
    const binDir = writeFakeGh(
      rootDir,
      [
        "#!/bin/sh",
        "if [ \"$1\" = \"auth\" ] && [ \"$2\" = \"status\" ]; then",
        "  echo \"Logged in\"",
        "  exit 0",
        "fi",
        "if [ \"$1\" = \"workflow\" ] && [ \"$2\" = \"view\" ]; then",
        "  exit 0",
        "fi",
        "if [ \"$1\" = \"secret\" ] && [ \"$2\" = \"list\" ]; then",
        "  repo=\"\"",
        "  while [ \"$#\" -gt 0 ]; do",
        "    if [ \"$1\" = \"--repo\" ]; then",
        "      repo=\"$2\"",
        "      shift 2",
        "    else",
        "      shift",
        "    fi",
        "  done",
        "  if [ \"$repo\" = \"acme/business-source\" ]; then",
        "    echo \"DEPLOY_REPOSITORY_DISPATCH_TOKEN  2026-04-29\"",
        "    exit 0",
        "  fi",
        "  if [ \"$repo\" = \"acme/rtnn-deploy\" ]; then",
        "    echo \"DEPLOY_SOURCE_REPOSITORY_TOKEN  2026-04-29\"",
        "    exit 0",
        "  fi",
        "  exit 1",
        "fi",
        "if [ \"$1\" = \"variable\" ] && [ \"$2\" = \"list\" ]; then",
        "  exit 0",
        "fi",
        "echo \"unexpected gh call: $*\" >&2",
        "exit 2",
        "",
      ].join("\n"),
    );

    const { result, report } = runPrereqs(rootDir, binDir);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(report.ok, true);
    assert.deepEqual(report.blocking, []);
    assert.equal(report.sourceSecrets.missing.length, 0);
    assert.equal(report.deploySecrets.missing.length, 0);
    assert.equal(report.sourceVariables.present, false);
    assert.match(report.nextActions.join("\n"), /CLIENT_RELEASE_SYNC_DEPLOY_FACTS=true/);
    assert.match(report.nextActions.join("\n"), /release:clients:github-dry-run/);
  });
});

test("client release GitHub prereqs reports missing remote workflow next actions", () => {
  withTempProject((rootDir) => {
    const binDir = writeFakeGh(
      rootDir,
      [
        "#!/bin/sh",
        "if [ \"$1\" = \"auth\" ] && [ \"$2\" = \"status\" ]; then",
        "  echo \"Logged in\"",
        "  exit 0",
        "fi",
        "if [ \"$1\" = \"workflow\" ] && [ \"$2\" = \"view\" ]; then",
        "  echo \"workflow not found\" >&2",
        "  exit 1",
        "fi",
        "if [ \"$1\" = \"secret\" ] && [ \"$2\" = \"list\" ]; then",
        "  repo=\"\"",
        "  while [ \"$#\" -gt 0 ]; do",
        "    if [ \"$1\" = \"--repo\" ]; then",
        "      repo=\"$2\"",
        "      shift 2",
        "    else",
        "      shift",
        "    fi",
        "  done",
        "  if [ \"$repo\" = \"acme/business-source\" ]; then",
        "    echo \"DEPLOY_REPOSITORY_DISPATCH_TOKEN  2026-04-29\"",
        "    exit 0",
        "  fi",
        "  if [ \"$repo\" = \"acme/rtnn-deploy\" ]; then",
        "    echo \"DEPLOY_SOURCE_REPOSITORY_TOKEN  2026-04-29\"",
        "    exit 0",
        "  fi",
        "  exit 1",
        "fi",
        "if [ \"$1\" = \"variable\" ] && [ \"$2\" = \"list\" ]; then",
        "  exit 0",
        "fi",
        "echo \"unexpected gh call: $*\" >&2",
        "exit 2",
        "",
      ].join("\n"),
    );

    const { result, report } = runPrereqs(rootDir, binDir);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(report.ok, false);
    assert.deepEqual(report.blocking, [
      "source-release-clients-workflow",
      "deploy-sync-client-release-facts-workflow",
    ]);
    assert.match(report.nextActions.join("\n"), /release-clients\.yml 合入并推送/);
    assert.match(report.nextActions.join("\n"), /sync-client-release-facts\.yml 合入并推送/);
  });
});

test("client release GitHub prereqs strict mode exits non-zero when blocked", () => {
  withTempProject((rootDir) => {
    const binDir = writeFakeGh(
      rootDir,
      [
        "#!/bin/sh",
        "if [ \"$1\" = \"auth\" ] && [ \"$2\" = \"status\" ]; then",
        "  echo \"not logged in\" >&2",
        "  exit 1",
        "fi",
        "exit 2",
        "",
      ].join("\n"),
    );

    const { result, report } = runPrereqs(rootDir, binDir, ["--strict"]);

    assert.equal(result.status, 1);
    assert.equal(report.ok, false);
    assert.deepEqual(report.blocking, ["gh-not-authenticated"]);
  });
});
