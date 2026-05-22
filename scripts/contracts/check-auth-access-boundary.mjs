import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const httpDecoratorPattern =
  /^\s*@(Get|Post|Put|Patch|Delete|Options|Head)\b/
const methodPattern = /^\s*(async\s+)?[A-Za-z_$][\w$]*\s*\(/
const permissionLiteralPattern = /["'`]admin:[a-z0-9][a-z0-9:-]*["'`]/g

function readText(file) {
  return readFileSync(file, 'utf8')
}

function collectFiles(root, predicate = () => true) {
  const results = []

  for (const entry of readdirSync(root)) {
    const file = join(root, entry)
    const stat = statSync(file)

    if (stat.isDirectory()) {
      results.push(...collectFiles(file, predicate))
      continue
    }

    if (predicate(file)) {
      results.push(file)
    }
  }

  return results
}

function isAdminControllerPath(line) {
  const match = line.match(/@Controller\(\s*['"`]([^'"`]+)['"`]\s*\)/)
  return Boolean(match && (match[1] === 'admin' || match[1].startsWith('admin/')))
}

function checkAdminControllers() {
  const issues = []
  const files = collectFiles(
    'apps/backend/src',
    (file) => file.endsWith('.controller.ts'),
  )

  for (const file of files) {
    const normalizedFile = relative(process.cwd(), file)
    const lines = readText(file).split(/\r?\n/)
    let pendingControllerIsAdmin = false
    let currentControllerIsAdmin = false
    let decorators = []

    lines.forEach((line, index) => {
      if (line.includes('@Controller(')) {
        pendingControllerIsAdmin = isAdminControllerPath(line)
      }

      if (/^\s*export\s+class\s+/.test(line)) {
        currentControllerIsAdmin = pendingControllerIsAdmin
        pendingControllerIsAdmin = false
        decorators = []
        return
      }

      if (!currentControllerIsAdmin) {
        return
      }

      if (/^\s*@/.test(line)) {
        decorators.push(line)
        return
      }

      if (/^\s*$/.test(line)) {
        return
      }

      if (methodPattern.test(line)) {
        const hasHttpMethod = decorators.some((item) =>
          httpDecoratorPattern.test(item),
        )
        const hasPermission = decorators.some((item) =>
          item.includes('@RequirePermission('),
        )

        if (hasHttpMethod && !hasPermission) {
          issues.push(
            `${normalizedFile}:${index + 1} admin controller method is missing @RequirePermission`,
          )
        }
      }

      decorators = []
    })
  }

  return issues
}

function checkAdminPermissionLiterals() {
  const issues = []
  const files = [
    ...collectFiles('apps/admin/app', (file) => /\.(ts|tsx)$/.test(file)),
    ...collectFiles('apps/admin/src', (file) => /\.(ts|tsx)$/.test(file)),
  ]

  for (const file of files) {
    const normalizedFile = relative(process.cwd(), file)
    const content = readText(file)
    for (const match of content.matchAll(permissionLiteralPattern)) {
      issues.push(
        `${normalizedFile}: use API_PERMISSIONS instead of literal ${match[0]}`,
      )
    }
  }

  return issues
}

function checkAdminRoleBypass() {
  const file = 'apps/admin/src/lib/permissions.ts'
  const content = readText(file)
  if (!content.includes('SUPER_ADMIN')) {
    return []
  }

  return [
    `${file}: role-name bypass is forbidden; check concrete permissions from the session`,
  ]
}

function checkAppUserPages() {
  const issues = []
  const files = collectFiles(
    'apps/app/app/(user)',
    (file) => file.endsWith('/page.tsx') || file.endsWith('\\page.tsx'),
  )

  for (const file of files) {
    const normalizedFile = relative(process.cwd(), file)
    const content = readText(file)
    if (!content.includes('requireSession(')) {
      issues.push(`${normalizedFile}: user page must call requireSession`)
    }
  }

  return issues
}

function checkSafeRedirects() {
  const issues = []
  const files = [
    ...collectFiles('apps/app/app', (file) => /\.(ts|tsx)$/.test(file)),
    ...collectFiles('apps/app/lib', (file) => /\.(ts|tsx)$/.test(file)),
  ]

  for (const file of files) {
    const normalizedFile = relative(process.cwd(), file)
    if (normalizedFile === 'apps/app/lib/server/redirects.ts') {
      continue
    }

    const content = readText(file)
    if (/\.startsWith\(\s*['"`]\/['"`]\s*\)/.test(content)) {
      issues.push(
        `${normalizedFile}: path redirect checks must use normalizeSafeRedirectPath`,
      )
    }
  }

  return issues
}

const issues = [
  ...checkAdminControllers(),
  ...checkAdminPermissionLiterals(),
  ...checkAdminRoleBypass(),
  ...checkAppUserPages(),
  ...checkSafeRedirects(),
]

if (issues.length > 0) {
  console.error('认证与权限边界检查失败：')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  process.exit(1)
}

console.log('认证与权限边界检查通过')
