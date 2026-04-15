import { spawn } from "node:child_process";

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Usage: node scripts/runtime/run-clean-command.mjs <command> [...args]");
  process.exit(1);
}

const env = {
  ...process.env,
  FORCE_COLOR: "0",
};

delete env.NO_COLOR;

const child = spawn(command, args, {
  stdio: "inherit",
  shell: false,
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
