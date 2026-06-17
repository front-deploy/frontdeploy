import type { AddressKind } from "../lib/address.js"
import { getMockIntelligence, type IntelligenceResponse } from "../lib/mockIntelligence.js"
import { fetchBirdeyeSecurity } from "../providers/birdeye.js"
import { fetchDexScreenerPairs, pickBestDexScreenerPair } from "../providers/dexscreener.js"
import { fetchGmgnTokenInfo } from "../providers/gmgn.js"
import { fetchGoPlusSolanaSecurity } from "../providers/goplus.js"
import { fetchHeliusAsset, fetchHeliusWalletAssets } from "../providers/helius.js"
import { fetchJupiterPrice } from "../providers/jupiter.js"
import { fetchSolanaTrackerToken } from "../providers/solanaTracker.js"
import { upsertIntelligenceSnapshot } from "../repositories/intelligenceStore.js"

export const getAddressIntelligence = async (
  address: string,
  requestedKind?: AddressKind
): Promise<IntelligenceResponse> => {
  const fallback = getMockIntelligence(address, requestedKind)
  const intelligence =
    fallback.kind === "token"
      ? await enrichTokenIntelligence(fallback)
      : await enrichWalletIntelligence(fallback)

  await upsertIntelligenceSnapshot(intelligence)
  return intelligence
}

const enrichTokenIntelligence = async (
  fallback: IntelligenceResponse
): Promise<IntelligenceResponse> => {
  const [
    gmgnResult,
    solanaTrackerResult,
    goPlusResult,
    priceResult,
    assetResult,
    securityResult,
    dexScreenerResult
  ] = await Promise.allSettled([
    fetchGmgnTokenInfo(fallback.address),
    fetchSolanaTrackerToken(fallback.address),
    fetchGoPlusSolanaSecurity(fallback.address),
    fetchJupiterPrice(fallback.address),
    fetchHeliusAsset(fallback.address),
    fetchBirdeyeSecurity(fallback.address),
    fetchDexScreenerPairs(fallback.address)
  ])

  const gmgn = valueFromSettled(gmgnResult)
  const solanaTracker = valueFromSettled(solanaTrackerResult)
  const goPlus = valueFromSettled(goPlusResult)
  const price = valueFromSettled(priceResult)
  const asset = valueFromSettled(assetResult)
  const security = valueFromSettled(securityResult)
  const dexPair = pickBestDexScreenerPair(valueFromSettled(dexScreenerResult) ?? [])
  const providers = [
    gmgn ? "GMGN" : null,
    solanaTracker ? "Solana Tracker" : null,
    goPlus ? "GoPlus" : null,
    price ? "Jupiter" : null,
    asset ? "Helius" : null,
    security ? "Birdeye" : null,
    dexPair ? "DexScreener" : null
  ].filter(isString)

  if (providers.length === 0) {
    return {
      ...fallback,
      providerStatus: "mock fallback: no backend provider keys configured or no provider data returned"
    }
  }

  const bestPool = pickBestSolanaTrackerPool(solanaTracker?.pools ?? [])
  const tokenName = gmgn?.name ?? solanaTracker?.name ?? asset?.content?.metadata?.name
  const tokenSymbol =
    gmgn?.symbol ?? solanaTracker?.symbol ?? asset?.content?.metadata?.symbol ?? asset?.token_info?.symbol
  const priceUsd =
    gmgn?.priceUsd ??
    gmgn?.price ??
    bestPool?.price?.usd ??
    price?.usdPrice ??
    asset?.token_info?.price_info?.price_per_token ??
    parseOptionalNumber(dexPair?.priceUsd)
  const liquidityUsd = gmgn?.liquidity ?? bestPool?.liquidity?.usd ?? price?.liquidity ?? dexPair?.liquidity?.usd
  const holderRisk = gmgn?.top10HolderPercent ?? readConcentration(security)
  const riskFindings = buildRiskFindings({
    solanaTracker,
    goPlus,
    gmgn
  })
  const providerRiskScore = scoreFromRiskProviders({
    fallbackScore: fallback.riskScore,
    solanaTrackerScore: solanaTracker?.risk?.score,
    rugged: solanaTracker?.risk?.rugged,
    holderConcentration: holderRisk,
    liquidityUsd,
    riskFindings
  })

  return {
    ...fallback,
    source: "hybrid",
    providerStatus: providers.join(" + "),
    riskScore: providerRiskScore,
    summary: `${providers.join(" + ")} backend enrichment loaded for ${tokenSymbol ?? tokenName ?? "token"}. ${fallback.summary}`,
    metrics: {
      ...fallback.metrics,
      tokenName: tokenName ?? "unknown",
      tokenSymbol: tokenSymbol ?? "unknown",
      priceUsd: priceUsd ?? "unavailable",
      liquidityUsd: liquidityUsd ?? "unavailable",
      priceChange24h: price?.priceChange24h ?? dexPair?.priceChange?.h24 ?? "unavailable",
      volume24h: dexPair?.volume?.h24 ?? "unavailable",
      dexId: dexPair?.dexId ?? "unavailable",
      holderConcentration: holderRisk ?? "unavailable",
      marketCap: gmgn?.marketCap ?? "unavailable",
      holderCount: gmgn?.holderCount ?? "unavailable",
      isHoneypot: booleanMetric(gmgn?.isHoneypot),
      mintable: booleanMetric(gmgn?.mintable),
      renounced: booleanMetric(gmgn?.renounced),
      solanaTrackerRiskScore: solanaTracker?.risk?.score ?? "unavailable",
      solanaTrackerRugged: booleanMetric(solanaTracker?.risk?.rugged),
      goPlusFreezeAuthority: goPlus?.freezeAuthority ?? "none",
      goPlusMintAuthority: goPlus?.mintAuthority ?? "none",
      goPlusMetadataMutable: booleanMetric(goPlus?.metadataMutable),
      riskFindings: riskFindings.length > 0 ? riskFindings.join("; ") : "none"
    },
    recentActivity: [
      price || dexPair ? `Market price: ${formatUsd(priceUsd)}` : "Market price unavailable",
      liquidityUsd ? `Liquidity: ${formatUsd(liquidityUsd)}` : "Liquidity unavailable",
      riskFindings.length > 0 ? `Risk findings: ${riskFindings.slice(0, 2).join(", ")}` : "No provider risk flags loaded"
    ]
  }
}

const enrichWalletIntelligence = async (
  fallback: IntelligenceResponse
): Promise<IntelligenceResponse> => {
  const holdings = await fetchHeliusWalletAssets(fallback.address)

  if (!holdings) {
    return {
      ...fallback,
      providerStatus: "mock fallback: Helius key not configured or wallet data unavailable"
    }
  }

  const assetCount = Number(holdings.total ?? holdings.items?.length ?? 0)

  return {
    ...fallback,
    source: "hybrid",
    providerStatus: "Helius",
    summary: `Helius backend enrichment found ${assetCount} tracked assets. ${fallback.summary}`,
    metrics: {
      ...fallback.metrics,
      trackedAssets: assetCount
    },
    recentActivity: [
      `Helius tracked assets: ${assetCount}`,
      "Wallet PnL still requires a dedicated PnL calculator",
      "Read-only intelligence only; no wallet connection or trading"
    ]
  }
}

const valueFromSettled = <T>(result: PromiseSettledResult<T | null>): T | null =>
  result.status === "fulfilled" ? result.value : null

const isString = (value: string | null): value is string => typeof value === "string"

const readConcentration = (security: Record<string, unknown> | null): number | null => {
  if (!security) {
    return null
  }

  for (const key of ["top10_holder_percent", "top10HolderPercent", "top_10_holder_rate"]) {
    const value = security[key]
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : null

    if (parsed !== null && Number.isFinite(parsed)) {
      return parsed > 1 ? parsed : parsed * 100
    }
  }

  return null
}

const formatUsd = (value?: number): string => {
  if (value === undefined) {
    return "unavailable"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 2
  }).format(value)
}

const parseOptionalNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const booleanMetric = (value: boolean | undefined): string => {
  if (value === undefined) {
    return "unavailable"
  }

  return value ? "yes" : "no"
}

type SolanaTrackerPool = {
  liquidity?: {
    usd?: number
  }
  price?: {
    usd?: number
  }
  marketCap?: {
    usd?: number
  }
}

const pickBestSolanaTrackerPool = (
  pools: SolanaTrackerPool[]
): SolanaTrackerPool | null =>
  pools.sort((left, right) => (right.liquidity?.usd ?? 0) - (left.liquidity?.usd ?? 0))[0] ?? null

const buildRiskFindings = ({
  solanaTracker,
  goPlus,
  gmgn
}: {
  solanaTracker: Awaited<ReturnType<typeof fetchSolanaTrackerToken>> | null
  goPlus: Awaited<ReturnType<typeof fetchGoPlusSolanaSecurity>> | null
  gmgn: Awaited<ReturnType<typeof fetchGmgnTokenInfo>> | null
}): string[] => {
  const findings = new Set<string>()

  if (solanaTracker?.risk?.rugged) findings.add("Solana Tracker rugged flag")
  for (const risk of solanaTracker?.risk?.risks ?? []) {
    if (risk.name && (risk.level === "danger" || risk.level === "warning")) {
      findings.add(risk.name)
    }
  }

  if (goPlus?.freezeAuthority) findings.add("Freeze authority enabled")
  if (goPlus?.mintAuthority) findings.add("Mint authority enabled")
  if (goPlus?.metadataMutable) findings.add("Mutable metadata")
  if (goPlus?.closable) findings.add("Closable token account risk")
  if (gmgn?.isHoneypot) findings.add("GMGN honeypot flag")
  if (gmgn?.mintable) findings.add("GMGN mintable flag")

  return [...findings].slice(0, 8)
}

const scoreFromRiskProviders = ({
  fallbackScore,
  solanaTrackerScore,
  rugged,
  holderConcentration,
  liquidityUsd,
  riskFindings
}: {
  fallbackScore: number
  solanaTrackerScore?: number
  rugged?: boolean
  holderConcentration: number | null
  liquidityUsd?: number
  riskFindings: string[]
}): number => {
  const normalizedTrackerScore =
    solanaTrackerScore === undefined ? undefined : Math.max(1, Math.min(100, solanaTrackerScore * 10))
  const base = normalizedTrackerScore ?? fallbackScore
  const ruggedPenalty = rugged ? 25 : 0
  const findingsPenalty = Math.min(24, riskFindings.length * 4)
  const holderPenalty =
    holderConcentration === null ? 0 : holderConcentration > 50 ? 15 : holderConcentration > 25 ? 6 : -4
  const liquidityPenalty = liquidityUsd === undefined ? 0 : liquidityUsd < 25_000 ? 12 : -3

  return Math.max(
    1,
    Math.min(100, base + ruggedPenalty + findingsPenalty + holderPenalty + liquidityPenalty)
  )
}
