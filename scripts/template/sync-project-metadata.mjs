import {
  buildBusinessProjectMetadata,
  readProjectMetadata,
  syncBusinessProjectMetadata,
} from "../lib/project-metadata.mjs";

function parseArgs(argv) {
  const options = {
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    throw new Error(`未知参数: ${arg}`);
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.dryRun
    ? {
        changed: false,
        metadataPath: ".rtnn/project.json",
        serialized: `${JSON.stringify(
          buildBusinessProjectMetadata(process.cwd(), readProjectMetadata(process.cwd())),
          null,
          2,
        )}\n`,
      }
    : syncBusinessProjectMetadata(process.cwd());

  console.log(
    `[project-metadata] ${options.dryRun ? "预览" : result.changed ? "已更新" : "无需变更"} ${result.metadataPath}`,
  );

  if (options.dryRun) {
    process.stdout.write(result.serialized);
    return;
  }
}

main();
