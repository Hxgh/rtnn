import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  RELEASE_STATUS_CODE_DETAILS,
  RELEASE_STATUS_CODES,
  RELEASE_STATUS_VALUES,
} from "../scripts/lib/release-status-contract.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("release status contract documents every stable code", () => {
  const documentedCodes = new Set(
    RELEASE_STATUS_CODE_DETAILS.map((item) => item.code),
  );

  for (const code of Object.values(RELEASE_STATUS_CODES)) {
    assert.equal(documentedCodes.has(code), true, `${code} is undocumented`);
  }
});

test("release status code documentation includes every stable code", () => {
  const content = readFileSync(
    path.join(ROOT_DIR, "docs/operations/release-status-codes.md"),
    "utf8",
  );

  for (const code of Object.values(RELEASE_STATUS_CODES)) {
    assert.match(content, new RegExp(`\\\`${code}\\\``), `${code} missing in docs`);
  }
});

test("release status contract uses known statuses and next actions", () => {
  const statuses = new Set(Object.values(RELEASE_STATUS_VALUES));

  for (const item of RELEASE_STATUS_CODE_DETAILS) {
    assert.equal(statuses.has(item.status), true, `${item.code} has invalid status`);
    assert.equal(Boolean(item.meaning), true, `${item.code} missing meaning`);
    assert.equal(Boolean(item.nextAction), true, `${item.code} missing next action`);
  }
});
