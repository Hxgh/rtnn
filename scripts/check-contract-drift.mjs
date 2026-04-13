import { spawnSync } from 'node:child_process'

const contractFiles = [
  'backend/openapi.json',
  'packages/api-sdk/src/generated/openapi.ts',
  'packages/shared-types/src/permissions.generated.ts',
]

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const commands = [
  ['pnpm', 'contracts:permissions'],
  ['pnpm', 'contracts:sync'],
]

for (const [command, ...args] of commands) {
  run(command, args)
}

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

if (
  contractFiles.some((file) => {
    const result = spawnSync('git', ['ls-files', '--error-unmatch', file], {
      stdio: 'ignore',
    })
    return result.status !== 0
  })
) {
  console.error(
    '\n契约文件缺失，请确认生成链路已完整执行并已纳入版本控制。\n',
  )
  process.exit(1)
}

console.log('契约漂移检查通过')
