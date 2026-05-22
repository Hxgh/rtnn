import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const registryFile = 'apps/backend/src/common/constants/permissions.const.ts'
const generatedFile = 'packages/shared-types/src/permissions.generated.ts'
const scanRoots = ['apps/backend/src', 'apps/admin/app', 'apps/admin/src']
const ignoredFiles = new Set([
  registryFile,
  'apps/backend/src/scripts/generate-permissions.ts',
])

function readText(file) {
  return readFileSync(file, 'utf8')
}

function collectFiles(root) {
  const results = []

  for (const entry of readdirSync(root)) {
    const file = join(root, entry)
    const stat = statSync(file)

    if (stat.isDirectory()) {
      results.push(...collectFiles(file))
      continue
    }

    if (/\.(ts|tsx|mts|cts)$/.test(file)) {
      results.push(file)
    }
  }

  return results
}

function extractRegistryPermissions(content) {
  const permissions = new Map()
  const entryPattern = /([A-Za-z][A-Za-z0-9]*)\s*:\s*\{[\s\S]*?key:\s*['"]([^'"]+)['"]/g

  for (const match of content.matchAll(entryPattern)) {
    permissions.set(match[1], match[2])
  }

  return permissions
}

function extractGeneratedPermissions(content) {
  const permissions = new Map()
  const permissionObjectPattern =
    /export const API_PERMISSIONS = \{([\s\S]*?)\} as const;/
  const objectMatch = content.match(permissionObjectPattern)

  if (!objectMatch) {
    return permissions
  }

  const entryPattern = /([A-Za-z][A-Za-z0-9]*)\s*:\s*["']([^"']+)["']/g
  for (const match of objectMatch[1].matchAll(entryPattern)) {
    permissions.set(match[1], match[2])
  }

  return permissions
}

function formatPermissionMap(map) {
  return [...map.entries()]
    .map(([code, key]) => `${code}=${key}`)
    .sort()
    .join('\n')
}

function assertGeneratedMatchesRegistry(registry, generated) {
  if (formatPermissionMap(registry) === formatPermissionMap(generated)) {
    return []
  }

  const issues = []
  for (const [code, key] of registry) {
    if (!generated.has(code)) {
      issues.push(`generated missing code ${code}`)
    } else if (generated.get(code) !== key) {
      issues.push(
        `generated key mismatch for ${code}: expected ${key}, got ${generated.get(code)}`,
      )
    }
  }

  for (const [code] of generated) {
    if (!registry.has(code)) {
      issues.push(`generated has unknown code ${code}`)
    }
  }

  return issues
}

function scanPermissionReferences(files, registry) {
  const knownCodes = new Set(registry.keys())
  const knownKeys = new Set(registry.values())
  const issues = []
  const permissionLiteralPattern =
    /["'`]((?:admin|customer):[a-z0-9][a-z0-9:-]*)["'`]/g
  const permissionCodePattern = /\b(?:API_PERMISSIONS|PERMISSIONS)\.([A-Za-z][A-Za-z0-9]*)\b/g

  for (const file of files) {
    const normalizedFile = relative(process.cwd(), file)
    if (ignoredFiles.has(normalizedFile)) {
      continue
    }

    const content = readText(file)
    for (const match of content.matchAll(permissionLiteralPattern)) {
      if (!knownKeys.has(match[1])) {
        issues.push(`${normalizedFile}: unknown permission key ${match[1]}`)
      }
    }

    for (const match of content.matchAll(permissionCodePattern)) {
      if (!knownCodes.has(match[1])) {
        issues.push(`${normalizedFile}: unknown permission code ${match[1]}`)
      }
    }
  }

  return issues
}

const registryPermissions = extractRegistryPermissions(readText(registryFile))
const generatedPermissions = extractGeneratedPermissions(readText(generatedFile))
const sourceFiles = scanRoots.flatMap(collectFiles)
const issues = [
  ...assertGeneratedMatchesRegistry(registryPermissions, generatedPermissions),
  ...scanPermissionReferences(sourceFiles, registryPermissions),
]

if (registryPermissions.size === 0) {
  issues.unshift(`no permissions found in ${registryFile}`)
}

if (generatedPermissions.size === 0) {
  issues.unshift(`no generated permissions found in ${generatedFile}`)
}

if (issues.length > 0) {
  console.error('权限契约检查失败：')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  process.exit(1)
}

console.log('权限契约检查通过')
