import { getConfig } from "../config.js"
import { fetchJson } from "./fetchJson.js"

export type BirdeyeSecurity = Record<string, unknown>

export const fetchBirdeyeSecurity = async (
  address: string
): Promise<BirdeyeSecurity | null> => {
  const apiKey = getConfig().birdeyeApiKey

  if (!apiKey) {
    return null
  }

  const json = await fetchJson<{ data?: BirdeyeSecurity }>(
    `https://public-api.birdeye.so/defi/token_security?address=${encodeURIComponent(address)}`,
    {
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana"
      }
    }
  )

  return json?.data ?? null
}
