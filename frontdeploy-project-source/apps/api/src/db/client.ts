import { Pool, type QueryResultRow } from "pg"

import { getConfig } from "../config.js"

let pool: Pool | undefined

export const isDatabaseConfigured = (): boolean => Boolean(getConfig().databaseUrl)

const getPool = (): Pool | undefined => {
  const config = getConfig()

  if (!config.databaseUrl) {
    return undefined
  }

  pool ??= new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined
  })

  return pool
}

export const query = async <T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = []
): Promise<T[]> => {
  const activePool = getPool()

  if (!activePool) {
    return []
  }

  const result = await activePool.query<T>(text, [...values])
  return result.rows
}
