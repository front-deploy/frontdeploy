import type { SolanaAddressType } from "./detectSolanaAddress"
import {
  getMockIntelligence,
  type AddressIntelligence,
  type TokenIntelligence,
  type WalletIntelligence
} from "./mockIntelligence"
import { calculateRiskScore, type RiskScore } from "./riskScore"
import { getApiSettings } from "./storage"

type BackendIntelligence = {
  address: string
  kind: "wallet" | "token"
  source: "mock" | "hybrid" | "live"
  providerStatus?: string
  riskScore: number
  label: string
  summary: string
  metrics: Record<string, string | number>
  recentActivity: string[]
}

export async function getAddressIntelligence(
  address: string,
  type: SolanaAddressType
): Promise<AddressIntelligence> {
  const settings = await getApiSettings()
  const fallback = getMockIntelligence(address, type)

  if (!settings.liveDataEnabled) {
    return {
      ...fallback,
      providerStatus: "Backend intelligence disabled"
    }
  }

  const backend = await fetchBackendIntelligence(settings.backendUrl, address, type)

  if (!backend) {
    return {
      ...fallback,
      providerStatus: "Backend unavailable, using local mock"
    }
  }

  return backend.kind === "token"
    ? mapBackendToken(backend, fallback as TokenIntelligence)
    : mapBackendWallet(backend, fallback as WalletIntelligence)
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 7000)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function fetchBackendIntelligence(
  backendUrl: string,
  address: string,
  type: SolanaAddressType
): Promise<BackendIntelligence | null> {
  const url = new URL(`/v1/intelligence/${encodeURIComponent(address)}`, normalizeBackendUrl(backendUrl))
  url.searchParams.set("kind", type)

  const response = await fetchWithTimeout(url)
  if (!response.ok) return null

  return (await response.json()) as BackendIntelligence
}

function mapBackendWallet(
  backend: BackendIntelligence,
  fallback: WalletIntelligence
): WalletIntelligence {
  return {
    ...fallback,
    source: backend.source,
    providerStatus: backend.providerStatus ?? "Backend intelligence",
    badge: backend.label as WalletIntelligence["badge"],
    label: backend.label,
    pnl7d: stringMetric(backend.metrics.pnl7d, fallback.pnl7d),
    winrate: stringMetric(backend.metrics.winRate, fallback.winrate),
    risk: riskFromScore(backend.riskScore, "wallet"),
    summary: backend.summary,
    recentActivity: backend.recentActivity
  }
}

function mapBackendToken(
  backend: BackendIntelligence,
  fallback: TokenIntelligence
): TokenIntelligence {
  return {
    ...fallback,
    source: backend.source,
    providerStatus: backend.providerStatus ?? "Backend intelligence",
    badge: backend.label as TokenIntelligence["badge"],
    tokenName: optionalString(backend.metrics.tokenName),
    tokenSymbol: optionalString(backend.metrics.tokenSymbol),
    priceUsd: optionalNumber(backend.metrics.priceUsd),
    liquidityUsd: optionalNumber(backend.metrics.liquidityUsd),
    priceChange24h: optionalNumber(backend.metrics.priceChange24h),
    risk: riskFromScore(backend.riskScore, "token"),
    holderRisk: stringMetric(backend.metrics.holderRisk, fallback.holderRisk),
    freshWalletActivity: stringMetric(
      backend.metrics.freshWalletActivity,
      fallback.freshWalletActivity
    ),
    whaleActivity: stringMetric(backend.metrics.whaleActivity, fallback.whaleActivity),
    summary: backend.summary,
    recentActivity: backend.recentActivity
  }
}

function normalizeBackendUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "")
  return trimmed.length > 0 ? trimmed : "http://127.0.0.1:8787"
}

function riskFromScore(score: number, type: SolanaAddressType): RiskScore {
  const fallback = calculateRiskScore(String(score), type)
  const normalizedScore = Math.max(1, Math.min(100, score))
  const level = normalizedScore >= 70 ? "high" : normalizedScore >= 40 ? "medium" : "low"

  return {
    ...fallback,
    score: normalizedScore,
    level,
    label: level === "high" ? "Risky" : level === "medium" ? "Watch" : "Clean"
  }
}

function stringMetric(value: string | number | undefined, fallback: string) {
  if (typeof value === "number") return String(value)
  return value && value !== "unknown" ? value : fallback
}

function optionalString(value: string | number | undefined) {
  return typeof value === "string" && value !== "unknown" && value !== "unavailable"
    ? value
    : undefined
}

function optionalNumber(value: string | number | undefined) {
  return typeof value === "number" ? value : undefined
}

function formatUsd(value?: number) {
  if (value === undefined) return "unavailable"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 2
  }).format(value)
}
