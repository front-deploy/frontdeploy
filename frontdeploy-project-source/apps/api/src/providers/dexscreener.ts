import { fetchJson } from "./fetchJson.js"

export type DexScreenerPair = {
  chainId?: string
  dexId?: string
  pairAddress?: string
  priceUsd?: string
  liquidity?: {
    usd?: number
  }
  volume?: {
    h24?: number
  }
  priceChange?: {
    h24?: number
  }
}

export const fetchDexScreenerPairs = async (
  address: string
): Promise<DexScreenerPair[]> => {
  const json = await fetchJson<DexScreenerPair[]>(
    `https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(address)}`
  )

  return Array.isArray(json) ? json : []
}

export const pickBestDexScreenerPair = (
  pairs: DexScreenerPair[]
): DexScreenerPair | null =>
  pairs
    .filter((pair) => pair.chainId === "solana" || pair.chainId === undefined)
    .sort((left, right) => (right.liquidity?.usd ?? 0) - (left.liquidity?.usd ?? 0))[0] ?? null
