import { spawn } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , projectName, defaultPort] = process.argv;

if (!projectName || !defaultPort) {
  console.error(
    "Usage: node scripts/run-next-standalone.mjs <project-name> <default-port>",
  );
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const projectRoot = path.join(workspaceRoot, projectName);
const standaloneRoot = path.join(projectRoot, ".next", "standalone", projectName);
const serverEntry = path.join(standaloneRoot, "server.js");

if (!existsSync(serverEntry)) {
  console.error(
    `Missing standalone server for ${projectName}. Run "pnpm -C ${projectName} build" first.`,
  );
  process.exit(1);
}

const syncDirectory = (sourceDir, targetDir) => {
  if (!existsSync(sourceDir)) {
    return;
  }

  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true });
};

syncDirectory(
  path.join(projectRoot, ".next", "static"),
  path.join(standaloneRoot, ".next", "static"),
);
syncDirectory(path.join(projectRoot, "public"), path.join(standaloneRoot, "public"));

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
