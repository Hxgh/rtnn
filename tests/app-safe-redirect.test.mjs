import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const repoRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(repoRoot, "apps/app/lib/server/redirects.ts");
const modulePath = path.join(repoRoot, ".tmp-tests/app-server-redirects.mjs");

async function importRedirects() {
  mkdirSync(path.dirname(modulePath), { recursive: true });
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  writeFileSync(modulePath, transpiled);
  return import(`file://${modulePath}?t=${Date.now()}`);
}

test("normalizeSafeRedirectPath keeps only same-app relative paths", async () => {
  const { normalizeSafeRedirectPath } = await importRedirects();

  assert.equal(normalizeSafeRedirectPath("/me"), "/me");
  assert.equal(
    normalizeSafeRedirectPath("/device-services?tab=scan#camera"),
    "/device-services?tab=scan#camera",
  );
  assert.equal(normalizeSafeRedirectPath(""), "/home");
  assert.equal(normalizeSafeRedirectPath("https://evil.example"), "/home");
  assert.equal(normalizeSafeRedirectPath("//evil.example/path"), "/home");
  assert.equal(normalizeSafeRedirectPath("/\\evil"), "/home");
  assert.equal(normalizeSafeRedirectPath("profile"), "/home");
  assert.equal(normalizeSafeRedirectPath(null, "/me"), "/me");
});
