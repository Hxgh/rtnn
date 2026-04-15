import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const contractFiles = [
  'apps/backend/openapi.json',
  'packages/api-sdk/src/generated/openapi.ts',
  'packages/shared-types/src/permissions.generated.ts',
]

function isGitWorktree() {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    stdio: 'ignore',
  })

  return result.status === 0
}

function isTrackedInGit(file) {
  const result = spawnSync('git', ['ls-files', '--error-unmatch', file], {
    stdio: 'ignore',
  })

  return result.status === 0
}

function hasGitDiff(file, staged = false) {
  const args = staged
    ? ['diff', '--cached', '--exit-code', '--', file]
    : ['diff', '--exit-code', '--', file]
  const result = spawnSync('git', args, { stdio: 'ignore' })

  return result.status !== 0
}

function snapshotContractFiles() {
  return contractFiles.map((file) => {
    try {
      const content = readFileSync(file)
      const hash = createHash('sha256').update(content).digest('hex')

      return {
        file,
        exists: true,
        hash,
      }
    } catch {
      return {
        file,
        exists: false,
        hash: null,
      }
    }
  })
}

function hasSnapshotDrift(before, after) {
  return before.some((entry, index) => {
    const next = after[index]

    return entry.exists !== next.exists || entry.hash !== next.hash
  })
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const useGitDiff =
  isGitWorktree() &&
  contractFiles.every((file) => isTrackedInGit(file) && !hasGitDiff(file) && !hasGitDiff(file, true))
const beforeSnapshot = useGitDiff ? null : snapshotContractFiles()

const commands = [
  ['pnpm', 'contracts:permissions'],
  ['pnpm', 'contracts:sync'],
]

for (const [command, ...args] of commands) {
  run(command, args)
}

if (useGitDiff) {
  for (const args of [
    ['diff', '--exit-code', '--', ...contractFiles],
    ['diff', '--cached', '--exit-code', '--', ...contractFiles],
  ]) {
    const result = spawnSync('git', args, { stdio: 'inherit' })
    if (result.status !== 0) {
      console.error(
        '\n契约产物有未提交变化，请重新执行 pnpm contracts:permissions 与 pnpm contracts:sync，并提交更新。\n',
      )
      process.exit(result.status ?? 1)
    }
  }

} else {
  const afterSnapshot = snapshotContractFiles()
  if (hasSnapshotDrift(beforeSnapshot, afterSnapshot)) {
    console.error(
      '\n当前目录不是 Git 仓库，契约产物在校验中发生变化，请先执行 pnpm contracts:permissions 与 pnpm contracts:sync 并保留生成结果后再继续。\n',
    )
    process.exit(1)
  }
}

console.log('契约漂移检查通过')
