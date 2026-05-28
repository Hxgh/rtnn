import { spawn } from "node:child_process";

const commands = [
  {
    label: "backend:test:integration",
    args: ["--filter", "backend", "test:integration"],
  },
  {
    label: "backend:test:e2e",
    args: ["--filter", "backend", "test:e2e"],
  },
];

const children = commands.map(({ label, args }) => {
  const child = spawn("pnpm", args, {
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(prefixLines(label, chunk));
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(prefixLines(label, chunk));
  });

  return new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      resolve({ label, code: code ?? 1, signal });
    });
  });
});

const results = await Promise.all(children);
const failed = results.filter((result) => result.code !== 0 || result.signal);

if (failed.length > 0) {
  for (const result of failed) {
    console.error(
      `[backend-tests-parallel] ${result.label} failed with ${
        result.signal ? `signal ${result.signal}` : `exit code ${result.code}`
      }`,
    );
  }
  process.exit(1);
}

console.log("[backend-tests-parallel] integration/e2e 并行测试通过");

function prefixLines(label, chunk) {
  return String(chunk)
    .split(/(\r?\n)/)
    .map((part) => {
      if (!part || /^\r?\n$/.test(part)) {
        return part;
      }
      return `[${label}] ${part}`;
    })
    .join("");
}
