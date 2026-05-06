#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const PROJECT_METADATA_FILE = ".rtnn/project.json";

function usage() {
  return `Usage:
  node scripts/release/detect-live-state-only-change.mjs --base <sha> --head <sha> [--json]

Detects whether a git range only changes .rtnn/project.json liveState.
Outputs GitHub Actions-compatible fields when GITHUB_OUTPUT is set.
`;
}

function parseArgs(argv) {
  const args = {
    base: "",
    head: "",
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--base":
        args.base = String(argv[++index] ?? "").trim();
        break;
      case "--head":
        args.head = String(argv[++index] ?? "").trim();
        break;
      case "--json":
        args.json = true;
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

function isZeroSha(value) {
  return /^0+$/.test(value);
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function listChangedFiles(base, head) {
  const output = git(["diff", "--name-only", "-z", base, head]);
  return output.split("\0").filter(Boolean);
}

function readJsonAtRef(ref, filePath) {
  return JSON.parse(git(["show", `${ref}:${filePath}`]));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeWithoutLiveState(value) {
  if (!isPlainObject(value)) {
    return value;
  }

  const clone = { ...value };
  delete clone.liveState;
  return clone;
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

function buildResult({ liveStateOnly, reason, changedFiles }) {
  return {
    liveStateOnly,
    reason,
    changedFilesCount: changedFiles.length,
    changedFiles,
  };
}

function detectLiveStateOnlyChange(args) {
  if (!args.base || !args.head) {
    return buildResult({
      liveStateOnly: false,
      reason: "missing-range",
      changedFiles: [],
    });
  }

  if (isZeroSha(args.base) || isZeroSha(args.head)) {
    return buildResult({
      liveStateOnly: false,
      reason: "unsupported-zero-sha",
      changedFiles: [],
    });
  }

  if (args.base === args.head) {
    return buildResult({
      liveStateOnly: false,
      reason: "empty-range",
      changedFiles: [],
    });
  }

  let changedFiles = [];
  try {
    changedFiles = listChangedFiles(args.base, args.head);
  } catch {
    return buildResult({
      liveStateOnly: false,
      reason: "unreadable-git-range",
      changedFiles: [],
    });
  }

  if (changedFiles.length !== 1 || changedFiles[0] !== PROJECT_METADATA_FILE) {
    return buildResult({
      liveStateOnly: false,
      reason: changedFiles.length === 0 ? "no-changes" : "changed-files-not-live-state-only",
      changedFiles,
    });
  }

  let beforeMetadata;
  let afterMetadata;
  try {
    beforeMetadata = readJsonAtRef(args.base, PROJECT_METADATA_FILE);
    afterMetadata = readJsonAtRef(args.head, PROJECT_METADATA_FILE);
  } catch {
    return buildResult({
      liveStateOnly: false,
      reason: "unreadable-project-metadata",
      changedFiles,
    });
  }

  const beforeWithoutLiveState = normalizeWithoutLiveState(beforeMetadata);
  const afterWithoutLiveState = normalizeWithoutLiveState(afterMetadata);
  const liveStateOnly =
    stableStringify(beforeWithoutLiveState) === stableStringify(afterWithoutLiveState);

  return buildResult({
    liveStateOnly,
    reason: liveStateOnly ? "project-live-state-only" : "project-metadata-contract-changed",
    changedFiles,
  });
}

function writeGithubOutput(result) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `live_state_only=${result.liveStateOnly ? "true" : "false"}`,
      `reason=${result.reason}`,
      `changed_files_count=${result.changedFilesCount}`,
      "",
    ].join("\n"),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = detectLiveStateOnlyChange(args);

  writeGithubOutput(result);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`live_state_only=${result.liveStateOnly ? "true" : "false"}`);
  console.log(`reason=${result.reason}`);
  console.log(`changed_files_count=${result.changedFilesCount}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
