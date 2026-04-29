import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CLIENTS = {
  "admin-tauri": {
    packageName: "@rtnn/admin-tauri",
    productName: "RTNN Admin",
    identifier: "com.rtnn.admin",
    devUrl: "http://localhost:5101",
    remoteUrl: "https://admin.example.com",
    capability: "default.json",
    permissions: ["core:default", "opener:default", "updater:default"],
    requiredCargoDependencies: ["serde_json", "tauri-plugin-opener", "tauri-plugin-updater"],
    requiredSourceSnippets: [
      "tauri_plugin_updater::UpdaterExt",
      "check_update",
      "install_update",
    ],
  },
  "app-tauri": {
    packageName: "@rtnn/app-tauri",
    productName: "RTNN App",
    identifier: "com.rtnn.app",
    devUrl: "http://localhost:5102",
    remoteUrl: "https://app.example.com",
    capability: "mobile.json",
    permissions: ["core:default", "opener:default"],
    requiredCargoDependencies: ["serde_json", "tauri-plugin-opener"],
    requiredSourceSnippets: [],
  },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function findWorkspaceRoot(startDir) {
  let current = startDir;

  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    current = path.dirname(current);
  }

  return startDir;
}

function assertFile(filePath) {
  assert(existsSync(filePath), `缺少文件: ${filePath}`);
}

function assertRgbaPng(filePath) {
  const file = readFileSync(filePath);
  const signature = file.subarray(0, 8).toString("hex");
  const chunkType = file.subarray(12, 16).toString("ascii");
  const bitDepth = file[24];
  const colorType = file[25];

  assert(
    signature === "89504e470d0a1a0a" && chunkType === "IHDR",
    `图标不是有效 PNG: ${filePath}`,
  );
  assert(bitDepth === 8 && colorType === 6, `图标必须是 8-bit RGBA PNG: ${filePath}`);
}

function assertIco(filePath) {
  const file = readFileSync(filePath);

  assert(file.length > 6, `图标不是有效 ICO: ${filePath}`);
  assert(
    file.readUInt16LE(0) === 0 && file.readUInt16LE(2) === 1 && file.readUInt16LE(4) > 0,
    `图标不是有效 ICO: ${filePath}`,
  );
}

function validateClient(rootDir, clientName, expected) {
  const clientDir = path.join(rootDir, "clients", clientName);
  const srcTauriDir = path.join(clientDir, "src-tauri");
  const packageJson = readJson(path.join(clientDir, "package.json"));
  const tauriConfig = readJson(path.join(srcTauriDir, "tauri.conf.json"));
  const capability = readJson(
    path.join(srcTauriDir, "capabilities", expected.capability),
  );
  const cargoToml = readFileSync(path.join(srcTauriDir, "Cargo.toml"), "utf8");
  const rustSource = readFileSync(path.join(srcTauriDir, "src/lib.rs"), "utf8");

  assert(packageJson.name === expected.packageName, `${clientName} package name 不匹配`);
  assert(packageJson.scripts?.validate, `${clientName} 缺少 validate 脚本`);
  assert(
    packageJson.devDependencies?.["@tauri-apps/cli"],
    `${clientName} 缺少 @tauri-apps/cli`,
  );

  assert(tauriConfig.productName === expected.productName, `${clientName} productName 不匹配`);
  assert(tauriConfig.identifier === expected.identifier, `${clientName} identifier 不匹配`);
  assert(tauriConfig.build?.devUrl === expected.devUrl, `${clientName} devUrl 不匹配`);
  assert(
    tauriConfig.build?.frontendDist === expected.remoteUrl,
    `${clientName} frontendDist 应使用远程 URL`,
  );
  assert(tauriConfig.app?.withGlobalTauri === true, `${clientName} 必须启用 withGlobalTauri`);
  assert(
    tauriConfig.bundle?.icon?.includes("icons/icon.png"),
    `${clientName} bundle.icon 缺少 icons/icon.png`,
  );
  assert(
    tauriConfig.bundle?.icon?.includes("icons/icon.ico"),
    `${clientName} bundle.icon 缺少 Windows icons/icon.ico`,
  );

  assert(
    capability.remote?.urls?.includes(expected.devUrl),
    `${clientName} capability 缺少 devUrl remote 授权`,
  );
  assert(
    capability.remote?.urls?.includes(expected.remoteUrl),
    `${clientName} capability 缺少 remote URL 授权`,
  );
  for (const permission of expected.permissions) {
    assert(
      capability.permissions?.includes(permission),
      `${clientName} capability 缺少 ${permission}`,
    );
  }

  for (const dependency of expected.requiredCargoDependencies) {
    assert(
      cargoToml.includes(`${dependency} =`),
      `${clientName} Cargo.toml 缺少 ${dependency}`,
    );
  }

  for (const snippet of expected.requiredSourceSnippets) {
    assert(
      rustSource.includes(snippet),
      `${clientName} Rust 壳缺少 ${snippet}`,
    );
  }

  for (const filePath of [
    "Cargo.toml",
    "build.rs",
    "icons/icon.ico",
    "icons/icon.png",
    "src/lib.rs",
    "src/main.rs",
  ]) {
    assertFile(path.join(srcTauriDir, filePath));
  }

  assertRgbaPng(path.join(srcTauriDir, "icons/icon.png"));
  assertIco(path.join(srcTauriDir, "icons/icon.ico"));
}

function main() {
  const rootDir = findWorkspaceRoot(process.cwd());
  const requested = process.argv.slice(2);
  const clientNames = requested.length > 0 ? requested : Object.keys(CLIENTS);

  for (const clientName of clientNames) {
    const expected = CLIENTS[clientName];
    assert(expected, `未知 Tauri client: ${clientName}`);
    validateClient(rootDir, clientName, expected);
    console.log(`[tauri-client-check] ${clientName} 通过`);
  }
}

main();
