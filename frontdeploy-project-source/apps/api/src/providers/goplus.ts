import { getConfig } from "../config.js"
import { fetchJson } from "./fetchJson.js"

export type GoPlusSolanaSecurity = {
  freezeAuthority?: string
  mintAuthority?: string
  metadataMutable?: boolean
  closable?: boolean
  defaultAccountState?: string
  raw: Record<string, unknown>
}

export const fetchGoPlusSolanaSecurity = async (
  address: string
): Promise<GoPlusSolanaSecurity | null> => {
  const apiKey = getConfig().goPlusApiKey

  if (!apiKey) {
    return null
  }

  const json = await fetchJson<Record<string, unknown>>(
    `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${encodeURIComponent(address)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: "application/json"
      }
    }
  )

  if (!json) {
    return null
  }

  return normalizeGoPlusSecurity(json, address)
}

const normalizeGoPlusSecurity = (
  raw: Record<string, unknown>,
  address: string
): GoPlusSolanaSecurity | null => {
  const result = getObject(raw, "result")
  const data = getObject(raw, "data")
  const source = getObject(result ?? {}, address) ?? getObject(data ?? {}, address) ?? result ?? data

  if (!source) {
    return null
  }

  return {
    freezeAuthority: readString(source, ["freeze_authority", "freezeAuthority"]),
    mintAuthority: readString(source, ["mint_authority", "mintAuthority"]),
    metadataMutable: readBoolean(source, ["metadata_mutable", "metadataMutable", "mutable_metadata"]),
    closable: readBoolean(source, ["closable", "close_authority"]),
    defaultAccountState: readString(source, ["default_account_state", "defaultAccountState"]),
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

const readString = (
  source: Record<string, unknown>,
  keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value
  }

  return undefined
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
