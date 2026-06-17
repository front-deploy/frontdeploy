import { getConfig } from "../config.js"
import { fetchJson } from "./fetchJson.js"

export type SolanaTrackerRisk = {
  score?: number
  rugged?: boolean
  risks?: Array<{
    name?: string
    description?: string
    level?: string
    score?: number
  }>
}

export type SolanaTrackerToken = {
  name?: string
  symbol?: string
  risk?: SolanaTrackerRisk
  pools?: Array<{
    liquidity?: {
      usd?: number
    }
    price?: {
      usd?: number
    }
    marketCap?: {
      usd?: number
    }
  }>
  raw: Record<string, unknown>
}

export const fetchSolanaTrackerToken = async (
  address: string
): Promise<SolanaTrackerToken | null> => {
  const apiKey = getConfig().solanaTrackerApiKey

  if (!apiKey) {
    return null
  }

  const json = await fetchJson<Record<string, unknown>>(
    `https://data.solanatracker.io/tokens/${encodeURIComponent(address)}`,
    {
      headers: {
        "x-api-key": apiKey,
        accept: "application/json"
      }
    }
  )

  return json ? normalizeSolanaTrackerToken(json) : null
}

const normalizeSolanaTrackerToken = (raw: Record<string, unknown>): SolanaTrackerToken => {
  const token = getObject(raw, "token") ?? raw
  const pools = Array.isArray(raw.pools) ? raw.pools.filter(isRecord) : []

  return {
    name: readString(token, ["name", "tokenName"]),
    symbol: readString(token, ["symbol", "tokenSymbol"]),
    risk: normalizeRisk(getObject(raw, "risk") ?? getObject(token, "risk")),
    pools: pools.map((pool) => ({
      liquidity: {
        usd: readNestedNumber(pool, ["liquidity", "usd"]) ?? readNumber(pool, ["liquidityUsd"])
      },
      price: {
        usd: readNestedNumber(pool, ["price", "usd"]) ?? readNumber(pool, ["priceUsd"])
      },
      marketCap: {
        usd: readNestedNumber(pool, ["marketCap", "usd"]) ?? readNumber(pool, ["marketCapUsd"])
      }
    })),
    raw
  }
}

const normalizeRisk = (risk: Record<string, unknown> | null): SolanaTrackerRisk | undefined => {
  if (!risk) {
    return undefined
  }

  const risks = Array.isArray(risk.risks) ? risk.risks.filter(isRecord) : []

  return {
    score: readNumber(risk, ["score"]),
    rugged: readBoolean(risk, ["rugged"]),
    risks: risks.map((item) => ({
      name: readString(item, ["name"]),
      description: readString(item, ["description"]),
      level: readString(item, ["level"]),
      score: readNumber(item, ["score"])
    }))
  }
}

const getObject = (
  source: Record<string, unknown>,
  key: string
): Record<string, unknown> | null => {
  const value = source[key]
  return isRecord(value) ? value : null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const readString = (source: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value
  }

  return undefined
}

const readNumber = (source: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = source[key]
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

const readNestedNumber = (
  source: Record<string, unknown>,
  path: [string, string]
): number | undefined => {
  const parent = getObject(source, path[0])
  return parent ? readNumber(parent, [path[1]]) : undefined
}

const readBoolean = (source: Record<string, unknown>, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      if (value === "true" || value === "1") return true
      if (value === "false" || value === "0") return false
    }
  }

  return undefined
}
