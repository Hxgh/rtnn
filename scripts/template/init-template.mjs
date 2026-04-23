import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    help: false,
    rewriteSource: false,
    skipInstall: false,
    skipContracts: false,
    envArgs: [],
    rewriteArgs: [],
    packageScope: "",
  };

  const envFlags = new Set([
    "--project-id",
    "--brand-name",
    "--cookie-prefix",
    "--database-name",
    "--database-port",
    "--backend-port",
    "--admin-port",
    "--app-port",
    "--weapp-port",
    "--image-prefix",
    "--deploy-application",
    "--deploy-event-type",
    "--admin-email",
    "--customer-email",
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--rewrite-source") {
      options.rewriteSource = true;
      continue;
    }

    if (arg === "--skip-install") {
      options.skipInstall = true;
      continue;
    }

    if (arg === "--skip-contracts") {
      options.skipContracts = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    const [flag, inlineValue] = arg.split("=", 2);
    const requiresValue = envFlags.has(flag) || flag === "--package-scope";
    if (!requiresValue) {
      throw new Error(`未知参数: ${arg}`);
    }

    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} 缺少值`);
    }

    if (inlineValue == null) {
      index += 1;
    }

    const normalizedArg = `${flag}=${value}`;

    if (envFlags.has(flag)) {
      options.envArgs.push(normalizedArg);
      if (flag === "--project-id" || flag === "--brand-name") {
        options.rewriteArgs.push(normalizedArg);
      }
      continue;
    }

    if (flag === "--package-scope") {
      options.packageScope = value;
      options.rewriteSource = true;
      options.rewriteArgs.push(normalizedArg);
      continue;
    }
  }

  if (options.force) {
    options.envArgs.push("--force");
  }

  if (options.dryRun) {
    options.rewriteArgs.push("--dry-run");
  }

  return options;
}

function printHelp() {
  console.log(`用法:
  pnpm run template:init -- [options]

常用：
  pnpm run template:init -- --project-id=acme --brand-name=ACME
  pnpm run template:init -- --project-id=acme --brand-name=ACME --rewrite-source --package-scope=acme

选项：
  --project-id <value>
  --brand-name <value>
  --cookie-prefix <value>
  --database-name <value>
  --backend-port <value>
  --admin-port <value>
  --app-port <value>
  --weapp-port <value>
  --image-prefix <value>
  --deploy-application <value>
  --deploy-event-type <value>
  --rewrite-source        同步改源码中的项目名、scope 和静态引用
  --package-scope <value> 指定 workspace package scope；传入即自动启用 --rewrite-source
  --skip-install          rewrite-source 后跳过 pnpm install
  --skip-contracts        rewrite-source 后跳过 contracts:permissions / contracts:sync
  --force                 覆盖已有受管文件
  --dry-run               只打印计划，不真正执行
`);
}

function run(command, args, label, dryRun) {
  console.log(`[template-init] ${label}`);
  console.log(`[template-init] $ ${command} ${args.join(" ")}`);

  if (dryRun) {
    return;
  }

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  run("node", ["scripts/bootstrap/setup-env.mjs", ...options.envArgs], "生成或更新根级模板环境", options.dryRun);
  run(
    "node",
    [
      "scripts/template/sync-project-metadata.mjs",
      ...(options.dryRun ? ["--dry-run"] : []),
    ],
    "同步业务仓项目事实文件",
    options.dryRun,
  );
  if (options.rewriteSource) {
    run(
      "node",
      ["scripts/template/rewrite-template-source.mjs", ...options.rewriteArgs],
      "重写源码级模板身份",
      options.dryRun,
    );

    if (!options.skipInstall) {
      run("pnpm", ["install"], "刷新依赖安装结果", options.dryRun);
    }

    if (!options.skipContracts) {
      run("pnpm", ["run", "contracts:permissions"], "刷新权限契约产物", options.dryRun);
      run("pnpm", ["run", "contracts:sync"], "刷新 OpenAPI / SDK 契约产物", options.dryRun);
    }
  }

  console.log("[template-init] 完成");
  console.log("[template-init] 建议继续执行：");
  console.log("  1. pnpm run check:template-bootstrap");
  console.log("  2. pnpm run check:template-derivation");
  console.log("  3. pnpm run check:release-candidate");
  console.log("  4. 根据实际仓库与部署仓信息补齐 .rtnn/project.json");
}

main();
