import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAdminRuntimeEnv,
  getAppRuntimeEnv,
  getBackendRuntimeEnv,
  getWeappRuntimeEnv,
  resolveTemplateEnv,
} from "./lib/template-env.mjs";

const [, , target, command, ...args] = process.argv;

if (!target || !command) {
  console.error(
    "Usage: node scripts/run-target-command.mjs <backend|admin|app|weapp> <command> [...args]",
  );
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const templateEnv = resolveTemplateEnv(workspaceRoot);

const targetConfig = {
  backend: {
    cwd: path.join(workspaceRoot, "apps/backend"),
    env: getBackendRuntimeEnv(templateEnv),
  },
  admin: {
    cwd: path.join(workspaceRoot, "apps/admin"),
    env: getAdminRuntimeEnv(templateEnv),
  },
  app: {
    cwd: path.join(workspaceRoot, "apps/app"),
    env: getAppRuntimeEnv(templateEnv),
  },
  weapp: {
    cwd: path.join(workspaceRoot, "apps/weapp"),
    env: getWeappRuntimeEnv(templateEnv),
  },
};

const selectedTarget = targetConfig[target];

if (!selectedTarget) {
  console.error(`Unknown target: ${target}`);
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: selectedTarget.cwd,
  stdio: "inherit",
  shell: false,
  env: {
    ...selectedTarget.env,
    ...process.env,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
