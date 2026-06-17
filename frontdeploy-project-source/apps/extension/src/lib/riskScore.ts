import type { SolanaAddressType } from "./detectSolanaAddress"

export type RiskLevel = "low" | "medium" | "high"

export interface RiskScore {
  score: number
  level: RiskLevel
  label: string
}

export function calculateRiskScore(address: string, type: SolanaAddressType): RiskScore {
  const seed = hashAddress(address)
  const baseScore = seed % 101
  const score = type === "token" ? Math.min(100, baseScore + 8) : baseScore
  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low"

  return {
    score,
    level,
    label: level === "high" ? "Risky" : level === "medium" ? "Watch" : "Clean"
  }
}

export function hashAddress(address: string): number {
  return [...address].reduce((total, char, index) => {
    return (total + char.charCodeAt(0) * (index + 17)) % 100000
  }, 0)
}

export function formatRisk(score: RiskScore): string {
  return `${score.score}/100 ${score.label}`
}
