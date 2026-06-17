import { inferAddressKind, type AddressKind } from "./address.js"
import { pickByHash, stableHash } from "./hash.js"

export type IntelligenceResponse = {
  address: string
  kind: AddressKind
  source: "mock" | "hybrid" | "live"
  providerStatus?: string
  riskScore: number
  label: string
  summary: string
  metrics: Record<string, string | number>
  recentActivity: string[]
}

const walletLabels = ["Smart Wallet", "Fresh Wallet", "Whale", "Sniper", "Risky", "Unknown"] as const
const tokenLabels = ["High Momentum", "New Pair", "Whale Watched", "Holder Risk", "Unknown"] as const

const walletActivity = [
  "Accumulated SOL ecosystem positions",
  "Rotated into newly trending pairs",
  "Reduced exposure after short momentum spike",
  "Interacted with multiple DEX routes",
  "Held core position through volatility"
] as const

const tokenActivity = [
  "Fresh wallet inflow increased",
  "Whale wallet movement detected",
  "Liquidity remains concentrated",
  "Holder distribution is stabilizing",
  "Short-term volume expanded"
] as const

const clampRisk = (value: number): number => Math.max(1, Math.min(100, value))

export const getMockIntelligence = (address: string, requestedKind?: string): IntelligenceResponse => {
  const seed = stableHash(address)
  const kind = inferAddressKind(address, requestedKind)
  const riskScore = clampRisk((seed % 91) + 5)

  if (kind === "token") {
    const holderRisk = clampRisk(((seed >>> 3) % 88) + 8)
    const freshWalletActivity = `${((seed >>> 7) % 34) + 6}%`
    const whaleActivity = `${((seed >>> 11) % 21) + 2}%`

    return {
      address,
      kind,
      source: "mock",
      riskScore,
      label: pickByHash(tokenLabels, seed),
      summary: `Mock token analysis shows ${riskScore > 70 ? "elevated" : "moderate"} risk with ${freshWalletActivity} fresh wallet activity and ${whaleActivity} whale activity.`,
      metrics: {
        holderRisk,
        freshWalletActivity,
        whaleActivity,
        confidence: "mock"
      },
      recentActivity: [
        pickByHash(tokenActivity, seed),
        pickByHash(tokenActivity, seed >>> 4),
        pickByHash(tokenActivity, seed >>> 8)
      ]
    }
  }

  const pnl7d = `${seed % 2 === 0 ? "+" : "-"}${((seed >>> 5) % 72) + 3}%`
  const winRate = `${((seed >>> 9) % 42) + 38}%`

  return {
    address,
    kind,
    source: "mock",
    riskScore,
    label: pickByHash(walletLabels, seed),
    summary: `Mock wallet analysis suggests a ${riskScore > 70 ? "higher-risk" : "measured"} trading profile with ${winRate} winrate over recent activity.`,
    metrics: {
      pnl7d,
      winRate,
      confidence: "mock"
    },
    recentActivity: [
      pickByHash(walletActivity, seed),
      pickByHash(walletActivity, seed >>> 4),
      pickByHash(walletActivity, seed >>> 8)
    ]
  }
}
