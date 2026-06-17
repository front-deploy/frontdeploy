import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

import pg from "pg"

const root = resolve(import.meta.dirname, "..")
const envPath = resolve(root, "apps/api/.env")
const migrationPath = resolve(
  root,
  "apps/api/supabase/migrations/001_initial_intelligence_schema.sql"
)

const parseEnv = async () => {
  const env = { ...process.env }

  if (!existsSync(envPath)) {
    return env
  }

  const content = await readFile(envPath, "utf8")

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const index = trimmed.indexOf("=")
    if (index === -1) continue

    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1)
    env[key] ??= value
  }

  return env
}

const env = await parseEnv()
const databaseUrl = env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required in apps/api/.env or process.env.")
}

const migration = await readFile(migrationPath, "utf8")
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
})

try {
  await pool.query(migration)
  console.log("Supabase/Postgres migration applied successfully.")
} finally {
  await pool.end()
}
