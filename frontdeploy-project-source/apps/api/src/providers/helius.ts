import { getConfig } from "../config.js"
import { fetchJson } from "./fetchJson.js"

export type HeliusAsset = {
  content?: {
    metadata?: {
      name?: string
      symbol?: string
    }
  }
  token_info?: {
    symbol?: string
    price_info?: {
      price_per_token?: number
      total_price?: number
    }
  }
}

export type HeliusWalletAssets = {
  total?: number
  items?: unknown[]
}

const heliusRpc = async <T>(method: string, params: Record<string, unknown>): Promise<T | null> => {
  const apiKey = getConfig().heliusApiKey

  if (!apiKey) {
    return null
  }

  const json = await fetchJson<{ result?: T }>(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "axiom-intelligence-api",
      method,
      params
    })
  })

  return json?.result ?? null
}

export const fetchHeliusAsset = (address: string): Promise<HeliusAsset | null> =>
  heliusRpc<HeliusAsset>("getAsset", { id: address })

export const fetchHeliusWalletAssets = (address: string): Promise<HeliusWalletAssets | null> =>
  heliusRpc<HeliusWalletAssets>("getAssetsByOwner", {
    ownerAddress: address,
    page: 1,
    limit: 10,
    displayOptions: {
      showFungible: true
    }
  })
