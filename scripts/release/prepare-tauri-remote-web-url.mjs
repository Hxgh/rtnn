import {
  appendFileSync,
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

function requireEnv(name) {
  const value = normalizeString(process.env[name]);
  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }

  return value;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value)}\n`);
  }
}

function normalizeRemoteWebUrl(value) {
  const rawValue = normalizeString(value);
  let url;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`CLIENT_WEB_URL 不是有效 URL: ${rawValue}`);
  }

  if (url.protocol !== "https:") {
    throw new Error("CLIENT_WEB_URL 必须是 https URL");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("CLIENT_WEB_URL 不能包含用户名、密码、query 或 hash");
  }

  const hostname = url.hostname.toLowerCase();
  const blockedHosts = new Set(["example.com", "example.net", "example.org"]);
  const isBlockedHost =
    blockedHosts.has(hostname) ||
    [...blockedHosts].some((host) => hostname.endsWith(`.${host}`));

  if (isBlockedHost) {
    throw new Error(`CLIENT_WEB_URL 不能使用模板占位域名: ${rawValue}`);
  }

  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error(`CLIENT_WEB_URL 不能使用本地开发地址: ${rawValue}`);
  }

  const pathname =
    url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}

function isHttpLikeUrl(value) {
  return /^https?:\/\//i.test(normalizeString(value));
}

function isLocalDevRemoteUrl(value) {
  if (!isHttpLikeUrl(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function dedupeStrings(values) {
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];
}

function buildRemoteCapabilityUrls(webUrl) {
  return dedupeStrings([webUrl, `${webUrl}/*`]);
}

function patchTauriConfig(configPath, webUrl) {
  const config = readJson(configPath);
  const previousFrontendDist = normalizeString(config.build?.frontendDist);
  const previousDevUrl = normalizeString(config.build?.devUrl);

  config.build = config.build ?? {};
  config.build.frontendDist = webUrl;
  delete config.build.devUrl;
  writeJson(configPath, config);

  return {
    path: configPath,
    frontendDist: webUrl,
    previousFrontendDistConfigured: Boolean(previousFrontendDist),
    previousDevUrlConfigured: Boolean(previousDevUrl),
    devUrlRemoved: Boolean(previousDevUrl),
    patched: previousFrontendDist !== webUrl,
  };
}

function patchCapabilityFile(filePath, webUrl) {
  const capability = readJson(filePath);
  const previousUrls = Array.isArray(capability.remote?.urls)
    ? capability.remote.urls
    : [];

  capability.remote = capability.remote ?? {};
  capability.remote.urls = buildRemoteCapabilityUrls(webUrl);
  writeJson(filePath, capability);

  return {
    path: filePath,
    urls: capability.remote.urls,
    previousUrlCount: previousUrls.length,
    removedUrlCount: previousUrls.filter((url) => normalizeString(url) !== webUrl).length,
    patched:
      JSON.stringify(previousUrls) !== JSON.stringify(capability.remote.urls),
  };
}

function patchCapabilities(capabilitiesDir, webUrl) {
  if (!existsSync(capabilitiesDir)) {
    throw new Error(`缺少 Tauri capabilities 目录: ${capabilitiesDir}`);
  }

  const files = readdirSync(capabilitiesDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`Tauri capabilities 目录缺少 JSON 文件: ${capabilitiesDir}`);
  }

  return files.map((fileName) =>
    patchCapabilityFile(path.join(capabilitiesDir, fileName), webUrl),
  );
}

function main() {
  const clientDir = requireEnv("CLIENT_DIR");
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const webUrl = normalizeRemoteWebUrl(requireEnv("CLIENT_WEB_URL"));
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const configPath = normalizeString(
    process.env.TAURI_CONFIG_PATH,
    path.join(clientDir, "src-tauri", "tauri.conf.json"),
  );
  const capabilitiesDir = normalizeString(
    process.env.TAURI_CAPABILITIES_DIR,
    path.join(clientDir, "src-tauri", "capabilities"),
  );

  if (!existsSync(configPath)) {
    throw new Error(`缺少 Tauri 配置文件: ${configPath}`);
  }

  const config = patchTauriConfig(configPath, webUrl);
  const capabilities = patchCapabilities(capabilitiesDir, webUrl);
  const report = {
    schemaVersion: "rtnn.tauri-remote-web-url.v1",
    status: "patched",
    client: normalizeString(process.env.CLIENT_NAME),
    target: normalizeString(process.env.CLIENT_TARGET),
    shell: normalizeString(process.env.CLIENT_SHELL),
    artifactName,
    webUrl,
    config,
    capabilities,
  };
  const outputPath = path.join(
    outputRoot,
    "tauri-remote-web-url",
    `${artifactName}.json`,
  );

  writeJson(outputPath, report);
  writeOutput("web_url", webUrl);
  writeOutput("patched", "true");
  console.log(`[tauri-remote-web-url] ${outputPath}`);
}

main();
