import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readFragments(inputDir) {
  if (!existsSync(inputDir)) {
    return [];
  }

  return readdirSync(inputDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => readJson(path.join(inputDir, fileName)));
}

function mergeFragments(fragments) {
  const byShell = new Map();

  for (const fragment of fragments) {
    const shell = normalizeString(fragment.shell);
    const latest = fragment.latest;
    if (!shell || !latest?.version || !latest.platforms) {
      throw new Error(`无效 Tauri updater fragment: ${fragment.artifactName || "(unknown)"}`);
    }

    const current = byShell.get(shell) ?? {
      shell,
      latest: {
        version: latest.version,
        notes: latest.notes ?? "",
        pub_date: latest.pub_date,
        platforms: {},
      },
    };

    if (current.latest.version !== latest.version) {
      throw new Error(`${shell} updater fragment 版本不一致`);
    }

    for (const [platform, payload] of Object.entries(latest.platforms)) {
      if (current.latest.platforms[platform]) {
        throw new Error(`${shell} updater fragment 平台重复: ${platform}`);
      }

      current.latest.platforms[platform] = payload;
    }

    byShell.set(shell, current);
  }

  return [...byShell.values()];
}

function main() {
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const inputDir = normalizeString(
    process.env.TAURI_UPDATER_FRAGMENT_DIR,
    path.join(outputRoot, "updater-fragments"),
  );
  const outputDir = normalizeString(
    process.env.TAURI_UPDATER_OUTPUT_DIR,
    path.join(outputRoot, "updater"),
  );
  const fragments = readFragments(inputDir);

  if (fragments.length === 0) {
    writeJson(path.join(outputDir, "skip.json"), {
      schemaVersion: "rtnn.tauri-updater-merge-skip.v1",
      reason: "no-updater-fragments",
      inputDir,
    });
    console.log("[tauri-updater-merge] no updater fragments");
    return;
  }

  const manifests = mergeFragments(fragments);
  const index = [];

  for (const manifest of manifests) {
    const fileName = `${manifest.shell}-latest.json`;
    writeJson(path.join(outputDir, fileName), manifest.latest);
    index.push({
      shell: manifest.shell,
      file: fileName,
      version: manifest.latest.version,
      platforms: Object.keys(manifest.latest.platforms).sort(),
    });
  }

  writeJson(path.join(outputDir, "index.json"), {
    schemaVersion: "rtnn.tauri-updater-index.v1",
    manifests: index,
  });
  console.log(`[tauri-updater-merge] ${index.length} manifests -> ${outputDir}`);
}

main();
