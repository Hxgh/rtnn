import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getClientBranding, resolveTemplateEnv } from "../lib/template-env.mjs";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");
const ICON_BASE_SIZE = 1024;
const ICON_OUTPUT_SIZE = 512;
const MAGICK = "/opt/homebrew/bin/magick";

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function writeFileIfChanged(filePath, content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

  if (existsSync(filePath) && readFileSync(filePath).equals(buffer)) {
    return false;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
  return true;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJsonIfChanged(filePath, value) {
  return writeFileIfChanged(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT_DIR,
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} 执行失败\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout.trim();
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeIconText(value) {
  const normalized = normalizeString(value, "RTNN")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  return (normalized || "RTNN").slice(0, 6);
}

function resolveBrandMarkAsset() {
  const brandMark = path.join(ROOT_DIR, "packages", "config", "assets", "brand-mark.svg");
  if (!existsSync(brandMark)) {
    throw new Error(`缺少品牌图标源: ${brandMark}`);
  }

  return readFileSync(brandMark, "utf8");
}

function buildShellIconSvg(brandMarkSvg) {
  const mark = brandMarkSvg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "")
    .replace(/<svg\b([^>]*)>/, '<svg$1 x="214" y="214" width="596" height="596">')
    .replaceAll('width="64"', "")
    .replaceAll('height="64"', "")
    .trim();
  if (!mark.includes("<svg")) {
    throw new Error("品牌图标源必须是 SVG");
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_BASE_SIZE}" height="${ICON_BASE_SIZE}" viewBox="0 0 ${ICON_BASE_SIZE} ${ICON_BASE_SIZE}">`,
    '  <defs>',
    '    <linearGradient id="rtnnIconBackground" x1="0" y1="0" x2="1" y2="1">',
    '      <stop offset="0" stop-color="#FFFFFF"/>',
    '      <stop offset="1" stop-color="#EDEDED"/>',
    "    </linearGradient>",
    "  </defs>",
    '  <rect x="32" y="32" width="960" height="960" rx="218" fill="url(#rtnnIconBackground)"/>',
    mark,
    "</svg>",
    "",
  ].join("\n");
}

function buildTextShellIconSvg(iconText) {
  const text = escapeXml(iconText);
  const fontSize = Math.max(118, Math.min(170, Math.floor(620 / text.length)));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_BASE_SIZE}" height="${ICON_BASE_SIZE}" viewBox="0 0 ${ICON_BASE_SIZE} ${ICON_BASE_SIZE}">`,
    '  <defs>',
    '    <linearGradient id="rtnnIconBackground" x1="0" y1="0" x2="1" y2="1">',
    '      <stop offset="0" stop-color="#FFFFFF"/>',
    '      <stop offset="1" stop-color="#EDEDED"/>',
    "    </linearGradient>",
    "  </defs>",
    '  <rect x="32" y="32" width="960" height="960" rx="218" fill="url(#rtnnIconBackground)"/>',
    '  <circle cx="512" cy="512" r="300" fill="#000000"/>',
    `  <text x="512" y="${text.length <= 4 ? 558 : 546}" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="0">${text}</text>`,
    "</svg>",
    "",
  ].join("\n");
}

function renderPngWithQuickLook(svgPath, outputPath) {
  const outputDir = path.dirname(svgPath);
  run("qlmanage", ["-t", "-s", String(ICON_BASE_SIZE), "-o", outputDir, svgPath]);
  const quickLookPng = `${svgPath}.png`;

  if (!existsSync(quickLookPng)) {
    throw new Error(`Quick Look 未生成 PNG: ${quickLookPng}`);
  }

  run(MAGICK, [
    quickLookPng,
    "-resize",
    `${ICON_OUTPUT_SIZE}x${ICON_OUTPUT_SIZE}`,
    "PNG32:" + outputPath,
  ]);
}

function renderIco(pngPath, icoPath) {
  run(MAGICK, [
    pngPath,
    "-define",
    "icon:auto-resize=256,128,64,48,32,16",
    icoPath,
  ]);
}

function syncTauriConfig(clientName, displayName) {
  const configPath = path.join(
    ROOT_DIR,
    "clients",
    clientName,
    "src-tauri",
    "tauri.conf.json",
  );
  const config = readJson(configPath);
  const windows = Array.isArray(config.app?.windows)
    ? config.app.windows.map((item) => ({
        ...item,
        title: displayName,
      }))
    : config.app?.windows;

  return writeJsonIfChanged(configPath, {
    ...config,
    productName: displayName,
    app: {
      ...(config.app ?? {}),
      windows,
    },
  });
}

function main() {
  const env = resolveTemplateEnv(ROOT_DIR);
  const branding = getClientBranding(env);
  const iconText = normalizeIconText(branding.iconText);
  const adminName = normalizeString(branding.clients.adminDesktop.installName);
  const appName = normalizeString(branding.clients.appMobile.installName);
  const brandMarkSvg = resolveBrandMarkAsset();
  const tmpDir = mkdtempSync(path.join(tmpdir(), "rtnn-client-branding-"));
  const iconSvgPath = path.join(tmpDir, "shell-icon.svg");
  const pngPath = path.join(tmpDir, "icon.png");
  const icoPath = path.join(tmpDir, "icon.ico");
  let changed = false;

  try {
    writeFileSync(
      iconSvgPath,
      iconText === "RTNN" ? buildShellIconSvg(brandMarkSvg) : buildTextShellIconSvg(iconText),
    );
    renderPngWithQuickLook(iconSvgPath, pngPath);
    renderIco(pngPath, icoPath);

    for (const targetPath of [
      "apps/app/public/brand/brand-mark.svg",
      "apps/admin/public/brand/brand-mark.svg",
    ]) {
      changed = writeFileIfChanged(path.join(ROOT_DIR, targetPath), brandMarkSvg) || changed;
    }

    for (const clientName of ["app-tauri", "admin-tauri"]) {
      const iconDir = path.join(ROOT_DIR, "clients", clientName, "src-tauri", "icons");
      changed = writeFileIfChanged(path.join(iconDir, "icon.png"), readFileSync(pngPath)) || changed;
      changed = writeFileIfChanged(path.join(iconDir, "icon.ico"), readFileSync(icoPath)) || changed;
    }

    for (const faviconPath of [
      "apps/app/app/favicon.ico",
      "apps/admin/app/favicon.ico",
    ]) {
      changed = writeFileIfChanged(path.join(ROOT_DIR, faviconPath), readFileSync(icoPath)) || changed;
    }

    changed = syncTauriConfig("app-tauri", appName) || changed;
    changed = syncTauriConfig("admin-tauri", adminName) || changed;

    console.log(
      `[client-branding] ${changed ? "updated" : "unchanged"} iconText=${iconText} app="${appName}" admin="${adminName}"`,
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
