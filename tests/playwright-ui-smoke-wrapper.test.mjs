import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts/runtime/run-playwright-ui-smoke.mjs",
);

function run(extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, "-c", "tooling/playwright/admin.config.ts"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
      RTNN_TEST_FORCE_MISSING_PLAYWRIGHT_BROWSER: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("local Playwright UI smoke wrapper skips when browser is missing", () => {
  const result = run({
    CI: "",
    RTNN_RUN_UI_SMOKE: "",
    RTNN_REQUIRE_PLAYWRIGHT_UI: "",
    RTNN_ALLOW_LOCAL_PLAYWRIGHT_UI: "",
  });

  assert.equal(result.status, 80, result.stderr);
  assert.match(result.stdout, /内置 Browser/);
});

test("CI Playwright UI smoke wrapper fails when browser is missing", () => {
  const result = run({
    CI: "true",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /未发现本机 Playwright Chromium/);
});

test("requested Playwright UI smoke fails when browser is missing", () => {
  const result = run({
    CI: "",
    RTNN_RUN_UI_SMOKE: "true",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /未发现本机 Playwright Chromium/);
});
