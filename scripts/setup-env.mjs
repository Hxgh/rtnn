import { copyFileSync, existsSync } from "node:fs"
import path from "node:path"

const rootDir = process.cwd()

const files = [
  ["backend/.env.example", "backend/.env"],
  ["admin/.env.example", "admin/.env.local"],
  ["app/.env.example", "app/.env.local"],
  ["weapp/.env.example", "weapp/.env"],
]

for (const [sourceRelative, targetRelative] of files) {
  const source = path.join(rootDir, sourceRelative)
  const target = path.join(rootDir, targetRelative)

  if (existsSync(target)) {
    console.log(`skip ${targetRelative} (already exists)`)
    continue
  }

  copyFileSync(source, target)
  console.log(`create ${targetRelative}`)
}
