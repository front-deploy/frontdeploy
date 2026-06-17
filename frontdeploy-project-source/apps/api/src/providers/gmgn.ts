import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { getConfig } from "../config.js"

const execFileAsync = promisify(execFile)

export type GmgnTokenInfo = {
  name?: string
  symbol?: string
  price?: number
  priceUsd?: number
  liquidity?: number
  marketCap?: number
  holderCount?: number
  top10HolderPercent?: number
  isHoneypot?: boolean
  mintable?: boolean
  renounced?: boolean
  raw: Record<string, unknown>
}

export const fetchGmgnTokenInfo = async (address: string): Promise<GmgnTokenInfo | null> => {
  const config = getConfig()

  if (!config.gmgnEnabled || !config.gmgnApiKey) {
    return null
  }

  try {
    const { stdout } = await execFileAsync(
      config.gmgnCliPath,
      ["token", "info", "--chain", "sol", "--address", address, "--raw"],
      {
        env: {
          ...process.env,
          GMGN_API_KEY: config.gmgnApiKey
        },
        timeout: config.providerTimeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      }
    )

    const raw = JSON.parse(stdout.trim()) as Record<string, unknown>
    return normalizeGmgnTokenInfo(raw)
  } catch {
    return null
  }
}

const normalizeGmgnTokenInfo = (raw: Record<string, unknown>): GmgnTokenInfo => {
  const data = getObject(raw, "data") ?? raw
  const security = getObject(data, "security") ?? data
  const pool = getObject(data, "pool") ?? getObject(data, "pair") ?? data

  return {
    name: readString(data, ["name", "tokenName"]),
    symbol: readString(data, ["symbol", "tokenSymbol"]),
    price: readNumber(data, ["price", "priceUsd", "usdPrice"]),
    priceUsd: readNumber(data, ["priceUsd", "usdPrice", "price"]),
    liquidity: readNumber(pool, ["liquidity", "liquidityUsd", "liquidity_usd"]),
    marketCap: readNumber(data, ["marketCap", "market_cap", "fdv"]),
    holderCount: readNumber(data, ["holderCount", "holder_count", "holders"]),
    top10HolderPercent: readNumber(security, [
      "top10HolderPercent",
      "top_10_holder_percent",
      "top10_holder_percent"
    ]),
    isHoneypot: readBoolean(security, ["isHoneypot", "honeypot"]),
    mintable: readBoolean(security, ["mintable", "isMintable"]),
    renounced: readBoolean(security, ["renounced", "isRenounced"]),
    raw
  }
}

const getObject = (
  source: Record<string, unknown>,
  key: string
): Record<string, unknown> | null => {
  const value = source[key]
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

const readString = (source: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) {
      return value
    }
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

const readBoolean = (source: Record<string, unknown>, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "boolean") {
      return value
    }

    if (typeof value === "string") {
      if (value === "true" || value === "1") return true
      if (value === "false" || value === "0") return false
    }
  }

  return undefined
}
