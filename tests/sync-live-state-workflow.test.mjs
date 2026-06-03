import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW_PATH = path.join(
  ROOT_DIR,
  ".github/workflows/sync-live-state.yml",
);

test("sync-live-state workflow wires runtime facts status and liveState PR", () => {
  const content = readFileSync(WORKFLOW_PATH, "utf8");

  for (const expected of [
    "repository_dispatch:",
    "sync-rtnn-live-state",
    "source_repository",
    "source_run_id",
    "runtime_facts_artifact",
    "runtime_facts_file",
    "mode:",
    "prepare-pr",
    "actions/download-artifact@v4",
    "repository: ${{ steps.input.outputs.source_repository }}",
    "DEPLOY_REPOSITORY_READ_TOKEN",
    "actions/upload-artifact@v4",
    "node scripts/release/run-release-status-ci.mjs",
    "continue-on-error:",
    "status == 'blocked'",
    "refusing to prepare liveState PR",
    "node scripts/release/run-live-state-pr-ci.mjs",
    "contents: write",
    "pull-requests: write",
    "rtnn-release-status",
    "rtnn-live-state-pr",
  ]) {
    assert.match(content, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(content, /pnpm run release:sync-live-state -- --write/);
});

test("promote-production workflow gates dispatch with production readiness", () => {
  const content = readFileSync(
    path.join(ROOT_DIR, ".github/workflows/promote-production.yml"),
    "utf8",
  );

  for (const expected of [
    "Check production readiness",
    "scripts/release/check-production-readiness.mjs",
    "--deploy-version",
    "--source-sha",
    "artifacts/production-readiness.json",
    "Dispatch deploy event",
  ]) {
    assert.match(content, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.equal(
    content.indexOf("Check production readiness") <
      content.indexOf("Dispatch deploy event"),
    true,
  );
});
