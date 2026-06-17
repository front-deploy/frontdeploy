import type { AddressKind } from "../lib/address.js"
import { stableHash } from "../lib/hash.js"

export type SummaryInput = {
  address: string
  kind: AddressKind
  riskScore?: number
  facts?: string[]
}

export type SummaryResponse = {
  source: "mock"
  summary: string
  safety: string
}

const sanitizeFact = (value: string): string =>
  value
    .replace(/private key|seed phrase|secret key|mnemonic/gi, "[redacted-sensitive-term]")
    .trim()
    .slice(0, 160)

export const buildAiSummary = (input: SummaryInput): SummaryResponse => {
  const seed = stableHash(input.address)
  const posture = (input.riskScore ?? seed % 100) >= 70 ? "higher-risk" : "watchlist"
  const facts = (input.facts ?? []).map(sanitizeFact).filter(Boolean).slice(0, 5)
  const factText = facts.length > 0 ? ` Signals: ${facts.join("; ")}.` : ""
  const subject = input.kind === "token" ? "token" : "wallet"

  return {
    source: "mock",
    summary: `Mock AI summary: this ${subject} is a ${posture} intelligence target. Review sizing, liquidity, holder distribution, and recent activity before acting.${factText}`,
    safety: "Read-only analysis only. No trading, wallet connection, signatures, private keys, or seed phrases."
  }
}
