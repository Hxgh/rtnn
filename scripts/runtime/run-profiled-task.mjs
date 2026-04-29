import { spawnSync } from "node:child_process";
import { resolveProjectProfile } from "../lib/project-profile.mjs";

function run(command, args, label) {
  console.log(`[profile-task] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function skip(service, task) {
  console.log(`[profile-task] 跳过 ${service} ${task}: 当前 project profile 未启用`);
}

function isEnabled(profile, service) {
  return Boolean(profile.services?.[service]?.enabled);
}

function runPackageChecks(scriptName) {
  for (const packageName of [
    "@rtnn/config",
    "@rtnn/shared-types",
    "@rtnn/shared-schemas",
    "@rtnn/api-sdk",
    "@rtnn/native-bridge",
  ]) {
    run("pnpm", ["--filter", packageName, scriptName], `${packageName} ${scriptName}`);
  }
}

function runLint(profile) {
  runPackageChecks("lint");

  for (const service of ["backend", "admin", "app"]) {
    if (isEnabled(profile, service)) {
      run("pnpm", ["--filter", service, "lint"], `${service} lint`);
    } else {
      skip(service, "lint");
    }
  }
}

function runTypecheck(profile) {
  runPackageChecks("typecheck");

  for (const service of ["backend", "admin", "app", "weapp"]) {
    if (isEnabled(profile, service)) {
      run("pnpm", ["--filter", service, "typecheck"], `${service} typecheck`);
    } else {
      skip(service, "typecheck");
    }
  }
}

function runBuild(profile) {
  run("pnpm", ["run", "build:packages"], "构建共享包");

  if (isEnabled(profile, "backend")) {
    run("pnpm", ["run", "build:backend"], "构建 backend");
    run("pnpm", ["run", "contracts:sync"], "同步 backend 契约与 SDK");
  } else {
    skip("backend", "build");
  }

  for (const service of ["admin", "app", "weapp"]) {
    if (isEnabled(profile, service)) {
      run("pnpm", ["run", `build:${service}`], `构建 ${service}`);
    } else {
      skip(service, "build");
    }
  }
}

function runTemplateDelivery(profile) {
  let ran = false;

  if (isEnabled(profile, "admin")) {
    ran = true;
    run("pnpm", ["run", "smoke:admin:ui"], "admin UI smoke");
  } else {
    skip("admin", "template delivery");
  }

  if (isEnabled(profile, "app")) {
    ran = true;
    run("pnpm", ["run", "smoke:app:ui"], "app UI smoke");
  } else {
    skip("app", "template delivery");
  }

  if (isEnabled(profile, "weapp")) {
    ran = true;
    run("pnpm", ["run", "smoke:weapp:h5"], "weapp H5 smoke");
    run("pnpm", ["--filter", "weapp", "build:h5"], "weapp H5 build");
  } else {
    skip("weapp", "template delivery");
  }

  if (!ran) {
    console.log("[profile-task] 当前 profile 未启用消费端 smoke 目标");
  }
}

function main() {
  const task = process.argv[2];
  const profile = resolveProjectProfile(process.cwd());

  switch (task) {
    case "lint":
      runLint(profile);
      break;
    case "typecheck":
      runTypecheck(profile);
      break;
    case "build":
      runBuild(profile);
      break;
    case "template-delivery":
      runTemplateDelivery(profile);
      break;
    default:
      throw new Error(
        `未知 profile task: ${task || "(empty)"}，可用值: lint, typecheck, build, template-delivery`,
      );
  }
}

main();
