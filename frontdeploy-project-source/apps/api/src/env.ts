import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadDotenv } from "dotenv"

const currentDir = dirname(fileURLToPath(import.meta.url))
const candidatePaths = [
  resolve(currentDir, "../.env"),
  resolve(currentDir, "../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "apps/api/.env")
]

for (const path of candidatePaths) {
  if (existsSync(path)) {
    loadDotenv({ path, override: false })
    break
  }
}
