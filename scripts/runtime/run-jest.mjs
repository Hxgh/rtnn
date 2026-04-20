import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const separatorIndex = args.indexOf("--");
const metaArgs = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
const jestArgs = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : [];

const requiredNodeArgs = [];

for (const arg of metaArgs) {
  if (arg.startsWith("--node-arg=")) {
    requiredNodeArgs.push(arg.slice("--node-arg=".length));
    continue;
  }

  console.error(`Unknown argument: ${arg}`);
  process.exit(1);
}

const optionalNodeArgs = [];

if (process.allowedNodeEnvironmentFlags.has("--no-experimental-webstorage")) {
  optionalNodeArgs.push("--no-experimental-webstorage");
}

const jestBin = path.resolve(process.cwd(), "node_modules/jest/bin/jest.js");
const child = spawn(process.execPath, [...optionalNodeArgs, ...requiredNodeArgs, jestBin, ...jestArgs], {
  stdio: "inherit",
  shell: false,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
