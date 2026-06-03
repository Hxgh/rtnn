import { cache } from "react";
import { readFile } from "node:fs/promises";
import { getRuntimeVersion, listClientDownloads } from "@/src/lib/api-client";
import type { ReleaseStatusSummary } from "./types";

const RELEASE_STATUS_FILE_ENV_KEYS = [
  "RTNN_RELEASE_STATUS_FILE",
  "RELEASE_STATUS_FILE",
] as const;

export const resolveReleaseOverview = cache(async () => {
  const [runtime, testingDownloads, productionDownloads, releaseStatus] =
    await Promise.allSettled([
      getRuntimeVersion(),
      listClientDownloads({ channel: "testing" }),
      listClientDownloads({ channel: "production" }),
      readReleaseStatusSummary(),
    ]);

  return {
    runtime: runtime.status === "fulfilled" ? runtime.value : null,
    testingDownloads:
      testingDownloads.status === "fulfilled" ? testingDownloads.value : [],
    productionDownloads:
      productionDownloads.status === "fulfilled"
        ? productionDownloads.value
        : [],
    releaseStatus:
      releaseStatus.status === "fulfilled" ? releaseStatus.value : null,
  };
});

function resolveReleaseStatusFile() {
  for (const key of RELEASE_STATUS_FILE_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

async function readReleaseStatusSummary(): Promise<ReleaseStatusSummary | null> {
  const filePath = resolveReleaseStatusFile();
  if (!filePath) {
    return null;
  }

  const raw = await readFile(filePath, "utf8");
  const payload = JSON.parse(raw) as {
    status?: unknown;
    code?: unknown;
    findings?: unknown;
  };
  const findings = Array.isArray(payload.findings) ? payload.findings : [];
  const levels = findings
    .map((item) =>
      item && typeof item === "object" && "level" in item
        ? String(item.level ?? "")
        : "",
    )
    .filter(Boolean);

  return {
    status: normalizeReleaseStatus(payload.status),
    code: String(payload.code ?? "UNKNOWN"),
    findingCount: findings.length,
    errorCount: levels.filter((level) => level === "error").length,
    warningCount: levels.filter((level) => level === "warn").length,
  };
}

function normalizeReleaseStatus(value: unknown): ReleaseStatusSummary["status"] {
  switch (value) {
    case "fresh":
    case "stale":
    case "blocked":
    case "skipped":
      return value;
    default:
      return "unknown";
  }
}
