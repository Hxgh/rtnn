import { spawn } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , projectDir, defaultPort] = process.argv;

if (!projectDir || !defaultPort) {
  console.error(
    "Usage: node scripts/runtime/run-next-standalone.mjs <project-dir> <default-port>",
  );
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
const projectRoot = path.join(workspaceRoot, projectDir);
const projectName = path.basename(projectDir);
const serverCandidates = [
  path.join(projectRoot, ".next", "standalone", projectDir, "server.js"),
  path.join(projectRoot, ".next", "standalone", projectName, "server.js"),
  path.join(projectRoot, ".next", "standalone", "server.js"),
];
const serverEntry = serverCandidates.find((candidate) => existsSync(candidate));

if (!serverEntry) {
  console.error(
    `Missing standalone server for ${projectDir}. Run "pnpm -C ${projectDir} build" first.`,
  );
  process.exit(1);
}

const appBundleRoot = path.dirname(serverEntry);

const syncDirectory = (sourceDir, targetDir) => {
  if (!existsSync(sourceDir)) {
    return;
  }

  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true });
};

syncDirectory(
  path.join(projectRoot, ".next", "static"),
  path.join(appBundleRoot, ".next", "static"),
);
syncDirectory(path.join(projectRoot, "public"), path.join(appBundleRoot, "public"));

const child = spawn(process.execPath, [serverEntry], {
  cwd: workspaceRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT ?? defaultPort,
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
