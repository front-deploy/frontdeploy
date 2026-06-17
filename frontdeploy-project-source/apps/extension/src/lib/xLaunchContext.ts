export type XReplyContext = {
  authorName: string
  handle: string
  text: string
  url: string
  timestamp?: string
  influence: "major" | "watch" | "unknown"
  matchedInfluencer?: string
}

export type LaunchDraft = {
  tokenName: string
  ticker: string
  description: string
  logoPrompt: string
  sourceUrl: string
  confidence: "high" | "medium" | "low"
  warnings: string[]
}

const WATCHLIST: Record<string, string> = {
  sama: "Sam Altman",
  elonmusk: "Elon Musk",
  coinbase: "Coinbase",
  solana: "Solana",
  aeyakovenko: "Anatoly Yakovenko",
  cz_binance: "CZ Binance",
  vitalikbuterin: "Vitalik Buterin"
}

const STOPWORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "they",
  "have",
  "would",
  "make",
  "very",
  "just",
  "will",
  "your",
  "about",
  "reply",
  "quote",
  "follow",
  "read",
  "like"
])

export function extractXReplyContext(article: HTMLElement): XReplyContext | null {
  const text = normalizeText(article.textContent ?? "")
  const handle = readHandle(text)
  const authorName = readAuthorName(article, handle)
  const tweetText = readTweetText(article, text)
  const url = readTweetUrl(article)

  if (!handle || tweetText.length < 12 || !url) {
    return null
  }

  const normalizedHandle = handle.toLowerCase()
  const matchedInfluencer = WATCHLIST[normalizedHandle]
  const influence = matchedInfluencer ? "major" : normalizedHandle.length > 0 ? "watch" : "unknown"
  const timestamp = article.querySelector("time")?.getAttribute("datetime") ?? undefined

  const context: XReplyContext = {
    authorName: authorName ?? matchedInfluencer ?? handle,
    handle,
    text: tweetText,
    url,
    influence
  }

  if (matchedInfluencer) context.matchedInfluencer = matchedInfluencer
  if (timestamp) context.timestamp = timestamp

  return context
}

export function createLaunchDraft(context: XReplyContext): LaunchDraft {
  const keywords = extractKeywords(context.text)
  const primary = keywords[0] ?? context.handle
  const secondary = keywords[1]
  const tokenName = toTitleCase(
    secondary ? `${primary} ${secondary}` : `${context.authorName.split(" ")[0]} ${primary}`
  ).slice(0, 32)
  const ticker = buildTicker(primary, secondary, context.handle)
  const confidence = context.influence === "major" && context.url.includes("/status/")
    ? "high"
    : context.url.includes("/status/")
      ? "medium"
      : "low"
  const warnings = [
    "Manual deploy only: this extension does not connect wallets or send transactions.",
    "Verify the reply URL and narrative before spending SOL.",
    "Celebrity replies are narrative signals, not endorsements."
  ]

  return {
    tokenName,
    ticker,
    description: `${tokenName} is a trend token draft generated from @${context.handle}'s X reply. Source: ${context.url}`,
    logoPrompt: `Minimal meme coin logo for ${tokenName} ($${ticker}), inspired by this X reply: "${context.text.slice(0, 180)}". Clean vector-style mascot, high contrast, readable at small size, no official brand marks, no celebrity likeness.`,
    sourceUrl: context.url,
    confidence,
    warnings
  }
}

export function buildChatGptLogoUrl(draft: LaunchDraft): string {
  const prompt = [
    "Generate a square meme coin logo image.",
    "",
    draft.logoPrompt,
    "",
    "Use a clean, original visual identity. Do not use official logos, copyrighted brand marks, or a real celebrity likeness. Make it readable as a crypto token icon at small size."
  ].join("\n")

  const url = new URL("https://chatgpt.com/")
  url.searchParams.set("q", prompt)
  return url.toString()
}

export function buildPumpFunCreateUrl(draft: LaunchDraft): string {
  const url = new URL("https://pump.fun/create")
  url.searchParams.set("name", draft.tokenName)
  url.searchParams.set("ticker", draft.ticker)
  url.searchParams.set("symbol", draft.ticker)
  url.searchParams.set("description", draft.description)
  url.searchParams.set("twitter", draft.sourceUrl)
  url.searchParams.set("website", draft.sourceUrl)
  return url.toString()
}

export function findXReplyArticles(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("article"))
    .filter((article) => !article.hasAttribute("data-axiom-launch-processed"))
    .filter((article) => Boolean(extractXReplyContext(article)))
}

function readHandle(text: string): string | null {
  const match = text.match(/@([A-Za-z0-9_]{1,15})/)
  return match?.[1] ?? null
}

function readAuthorName(article: HTMLElement, handle: string | null): string | null {
  const userName = article.querySelector('[data-testid="User-Name"]')?.textContent
  if (!userName) return null

  const normalized = normalizeText(userName)
  return handle ? normalized.split(`@${handle}`)[0]?.trim() || null : normalized
}

function readTweetText(article: HTMLElement, fallbackText: string): string {
  const tweetText = Array.from(article.querySelectorAll<HTMLElement>('[data-testid="tweetText"]'))
    .map((node) => normalizeText(node.textContent ?? ""))
    .filter(Boolean)
    .join(" ")

  if (tweetText) return tweetText

  return fallbackText
    .replace(/@\w{1,15}/g, "")
    .replace(/\b(Follow|Reply|Copy link|Read \d+(?:\.\d+)?[KMB]? replies)\b/gi, "")
    .trim()
    .slice(0, 280)
}

function readTweetUrl(article: HTMLElement): string | null {
  const statusLink = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'))
    .map((anchor) => anchor.href)
    .find(Boolean)

  if (statusLink) return statusLink

  return location.href.includes("/status/") ? location.href : null
}

function extractKeywords(text: string): string[] {
  return normalizeText(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && word.length <= 12 && !STOPWORDS.has(word))
    .slice(0, 4)
}

function buildTicker(primary: string, secondary: string | undefined, handle: string): string {
  const seed = `${primary}${secondary ?? ""}${handle}`
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
  const ticker = seed.length >= 3 ? seed.slice(0, 6) : handle.slice(0, 6).toUpperCase()
  return ticker || "TREND"
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`)
    .join(" ")
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}
