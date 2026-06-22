import { detectSolanaAddresses } from "./detectSolanaAddress"

export type AxiomTokenContext = {
  address: string
  ticker?: string
  name?: string
  shortAddress?: string
  deployerHandle?: string
  websiteUrl?: string
  githubRepoUrl?: string
  xPostUrl?: string
  pumpFunUrl?: string
  marketCapUsd?: number
  narrative?: string
  source: "axiom-card" | "axiom-link" | "manual"
}

export type AxiomTokenCardMatch = {
  element: HTMLElement
  context: AxiomTokenContext
}

const CARD_PROCESSED_ATTR = "data-axiom-intel-card"
const MAX_CONTEXT_TEXT = 600

export function findAxiomTokenCards(root: ParentNode = document): AxiomTokenCardMatch[] {
  const candidates = new Map<string, AxiomTokenCardMatch>()
  const elements = Array.from(root.querySelectorAll<HTMLElement>("a, div, article, section, li"))

  for (const element of elements) {
    const address = findFullAddress(element)
    if (!address || candidates.has(address)) continue

    const card = findTokenCardElement(element)
    if (!card || card.hasAttribute(CARD_PROCESSED_ATTR)) continue

    const context = extractAxiomTokenContext(card, address)
    if (!context) continue

    candidates.set(address, {
      element: card,
      context
    })
  }

  return [...candidates.values()]
}

export function markTokenCardProcessed(element: HTMLElement, address: string) {
  element.setAttribute(CARD_PROCESSED_ATTR, address)
}

export function extractAxiomTokenContext(
  element: HTMLElement,
  address: string
): AxiomTokenContext | null {
  const text = normalizeText(element.textContent ?? "")
  const links = readLinks(element)
  const githubRepoUrl = links.find((href) => isGithubRepoUrl(href))
  const xLinks = links.filter((href) => isXUrl(href))
  const xPostUrl = xLinks.find((href) => /\/status\/\d+/.test(href)) ?? xLinks[0]
  const websiteUrl = links.find((href) => isLikelyProjectWebsite(href))
  const pumpFunUrl = links.find((href) => isPumpFunUrl(href))
  const ticker = readTicker(text)
  const shortAddress = readShortAddress(text)
  const marketCapUsd = readMarketCap(text)
  const deployerHandle = readXHandle(text) ?? readHandleFromUrl(xPostUrl)

  if (!ticker && !shortAddress && !marketCapUsd && links.length === 0) {
    return null
  }

  const context: AxiomTokenContext = {
    address,
    narrative: buildNarrative({ ticker, deployerHandle, text }),
    source: "axiom-card"
  }

  if (ticker) context.ticker = ticker
  const name = readName(text, ticker)
  if (name) context.name = name
  if (shortAddress) context.shortAddress = shortAddress
  if (deployerHandle) context.deployerHandle = deployerHandle
  if (websiteUrl) context.websiteUrl = websiteUrl
  if (githubRepoUrl) context.githubRepoUrl = githubRepoUrl
  if (xPostUrl) context.xPostUrl = xPostUrl
  if (pumpFunUrl) context.pumpFunUrl = pumpFunUrl
  if (marketCapUsd !== undefined) context.marketCapUsd = marketCapUsd

  return context
}

function findFullAddress(element: HTMLElement): string | null {
  const textAddress = detectSolanaAddresses(element.textContent ?? "").find(
    (detection) => detection.type === "token"
  )?.address
  if (textAddress) return textAddress

  for (const link of readLinks(element)) {
    const linkAddress = detectSolanaAddresses(link).find(
      (detection) => detection.type === "token"
    )?.address
    if (linkAddress) return linkAddress
  }

  return null
}

function findTokenCardElement(start: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = start

  for (let depth = 0; current && depth < 8; depth += 1) {
    if (looksLikeTokenCard(current)) return current
    current = current.parentElement
  }

  return start
}

function looksLikeTokenCard(element: HTMLElement): boolean {
  const text = normalizeText(element.textContent ?? "")
  if (text.length < 24 || text.length > 1800) return false

  const signals = [
    /\bMC\s*\$?\d/i.test(text),
    /\bTX\s*\d/i.test(text),
    /\bSOL\b/i.test(text),
    /@[A-Za-z0-9_]{1,15}/.test(text),
    /\b[1-9A-HJ-NP-Za-km-z]{3,8}\.\.\.[1-9A-HJ-NP-Za-km-z]{3,8}/.test(text)
  ]

  return signals.filter(Boolean).length >= 2
}

function readLinks(element: HTMLElement): string[] {
  const links = Array.from(element.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchor) => anchor.href)
    .filter(Boolean)

  if (element instanceof HTMLAnchorElement && element.href) {
    links.push(element.href)
  }

  return [...new Set(links.map(normalizeUrl).filter(isString))]
}

function normalizeUrl(value: string): string | null {
  try {
    return new URL(value, window.location.href).toString()
  } catch {
    return null
  }
}

function isLikelyProjectWebsite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return ![
      "axiom.trade",
      "x.com",
      "twitter.com",
      "t.me",
      "telegram.me",
      "telegram.org",
      "github.com",
      "solscan.io",
      "birdeye.so",
      "dexscreener.com",
      "pump.fun"
    ].some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`))
  } catch {
    return false
  }
}

function isGithubRepoUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === "github.com" && parsed.pathname.split("/").filter(Boolean).length >= 2
  } catch {
    return false
  }
}

function isPumpFunUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return hostname === "pump.fun"
  } catch {
    return false
  }
}

function isXUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return hostname === "x.com" || hostname === "twitter.com"
  } catch {
    return false
  }
}

function readTicker(text: string): string | undefined {
  const [firstLine] = text.split(/\s{2,}|\n/)
  const match = firstLine?.match(/\b([$A-Z][A-Z0-9$]{1,15})\b/)
  return match?.[1]?.replace(/^\$/, "")
}

function readName(text: string, ticker?: string): string | undefined {
  if (!ticker) return undefined
  const index = text.indexOf(ticker)
  if (index < 0) return undefined

  const afterTicker = text.slice(index + ticker.length).trim()
  const name = afterTicker.split(/\s+(?:v|\$|MC|TX|@)/)[0]?.trim()
  return name && name.length > 1 ? name.slice(0, 48) : undefined
}

function readShortAddress(text: string): string | undefined {
  return text.match(/\b[1-9A-HJ-NP-Za-km-z]{3,8}\.\.\.[1-9A-HJ-NP-Za-km-z]{3,8}(?:pump)?\b/)?.[0]
}

function readXHandle(text: string): string | undefined {
  return text.match(/@([A-Za-z0-9_]{1,15})/)?.[1]
}

function readHandleFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[0]
  } catch {
    return undefined
  }
}

function readMarketCap(text: string): number | undefined {
  const match = text.match(/\bMC\s*\$?\s*([0-9]+(?:\.[0-9]+)?)([KMB])?/i)
  if (!match) return undefined

  const value = Number(match[1])
  const multiplier = match[2]?.toUpperCase() === "B" ? 1_000_000_000 : match[2]?.toUpperCase() === "M" ? 1_000_000 : match[2]?.toUpperCase() === "K" ? 1_000 : 1
  return Number.isFinite(value) ? value * multiplier : undefined
}

function buildNarrative({
  ticker,
  deployerHandle,
  text
}: {
  ticker: string | undefined
  deployerHandle: string | undefined
  text: string
}): string {
  const parts = [
    ticker ? `${ticker} token card on Axiom` : "Token card on Axiom",
    deployerHandle ? `deployer/social handle @${deployerHandle}` : "",
    text.slice(0, MAX_CONTEXT_TEXT)
  ].filter(Boolean)

  return parts.join(". ")
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function isString(value: string | null): value is string {
  return typeof value === "string"
}
