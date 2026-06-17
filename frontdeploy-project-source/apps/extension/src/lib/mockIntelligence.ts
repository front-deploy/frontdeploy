import type { SolanaAddressType } from "./detectSolanaAddress"
import { calculateRiskScore, hashAddress, type RiskScore } from "./riskScore"

export type BadgeLabel =
  | "Smart Wallet"
  | "Fresh Wallet"
  | "Whale"
  | "Sniper"
  | "Risky"
  | "Unknown"

export interface WalletIntelligence {
  address: string
  type: "wallet"
  source: "mock" | "live" | "hybrid"
  providerStatus: string
  badge: BadgeLabel
  label: string
  pnl7d: string
  winrate: string
  risk: RiskScore
  summary: string
  recentActivity: string[]
}

export interface TokenIntelligence {
  address: string
  type: "token"
  source: "mock" | "live" | "hybrid"
  providerStatus: string
  badge: BadgeLabel
  tokenName?: string | undefined
  tokenSymbol?: string | undefined
  priceUsd?: number | undefined
  liquidityUsd?: number | undefined
  priceChange24h?: number | undefined
  risk: RiskScore
  holderRisk: string
  freshWalletActivity: string
  whaleActivity: string
  summary: string
  recentActivity: string[]
}

export type AddressIntelligence = WalletIntelligence | TokenIntelligence

const BADGES: BadgeLabel[] = [
  "Smart Wallet",
  "Fresh Wallet",
  "Whale",
  "Sniper",
  "Risky",
  "Unknown"
]

export function getMockIntelligence(
  address: string,
  type: SolanaAddressType
): AddressIntelligence {
  return type === "token" ? getMockTokenIntelligence(address) : getMockWalletIntelligence(address)
}

export function getMockWalletIntelligence(address: string): WalletIntelligence {
  const seed = hashAddress(address)
  const risk = calculateRiskScore(address, "wallet")
  const pnl = ((seed % 3200) / 10 - 80).toFixed(1)
  const winrate = 38 + (seed % 47)
  const badge = risk.level === "high" ? "Risky" : BADGES[seed % BADGES.length] ?? "Unknown"

  return {
    address,
    type: "wallet",
    source: "mock",
    providerStatus: "Mock intelligence",
    badge,
    label: "Unlabeled wallet",
    pnl7d: `${Number(pnl) >= 0 ? "+" : ""}${pnl}%`,
    winrate: `${winrate}%`,
    risk,
    summary:
      risk.level === "high"
        ? "AI mock: aggressive wallet with clustered entries and volatile exits."
        : "AI mock: wallet shows selective entries with moderate follow-through activity.",
    recentActivity: [
      "Bought two mid-liquidity launches in the last session",
      "Rotated partial profits into newer pairs",
      "Interacted with high-velocity token markets"
    ]
  }
}

export function getMockTokenIntelligence(address: string): TokenIntelligence {
  const seed = hashAddress(address)
  const risk = calculateRiskScore(address, "token")
  const badge = risk.level === "high" ? "Risky" : seed % 3 === 0 ? "Whale" : "Unknown"

  return {
    address,
    type: "token",
    source: "mock",
    providerStatus: "Mock intelligence",
    badge,
    risk,
    holderRisk: risk.level === "high" ? "Concentrated" : "Moderate",
    freshWalletActivity: seed % 2 === 0 ? "Elevated" : "Normal",
    whaleActivity: seed % 5 === 0 ? "Active accumulation" : "Light movement",
    summary:
      risk.level === "high"
        ? "AI mock: token shows elevated holder concentration and fast fresh-wallet inflow."
        : "AI mock: token activity looks mixed, with no critical concentration signal in mock data.",
    recentActivity: [
      "Fresh wallets appeared in recent buys",
      "Liquidity movement remains within mock normal range",
      "Top holders should be reviewed before sizing up"
    ]
  }
}
