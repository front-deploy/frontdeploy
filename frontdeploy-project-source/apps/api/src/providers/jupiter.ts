import { getConfig } from "../config.js"
import { fetchJson } from "./fetchJson.js"

export type JupiterPrice = {
  usdPrice?: number
  liquidity?: number
  priceChange24h?: number
}

export const fetchJupiterPrice = async (address: string): Promise<JupiterPrice | null> => {
  const apiKey = getConfig().jupiterApiKey

  if (!apiKey) {
    return null
  }

  const json = await fetchJson<Record<string, JupiterPrice | undefined>>(
    `https://api.jup.ag/price/v3?ids=${encodeURIComponent(address)}`,
    {
      headers: {
        "x-api-key": apiKey
      }
    }
  )

  return json?.[address] ?? null
}
