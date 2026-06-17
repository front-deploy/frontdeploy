import { getConfig } from "../config.js"

export type ReputationInput = {
  tokenAddress: string
  claimedCa?: string
  websiteUrl?: string
  githubRepoUrl?: string
  xPostUrl?: string
  narrative?: string
  marketCapUsd?: number
}

export type ReputationCheck = {
  name: string
  status: "pass" | "warn" | "fail" | "manual"
  detail: string
  weight: number
}

export type ReputationResponse = {
  score: number
  level: "strong" | "watch" | "weak"
  summary: string
  checks: ReputationCheck[]
  evidence: {
    websiteCaFound: boolean
    githubCaFound: boolean
    xCaFound: boolean
    github?: {
      fullName: string
      stars: number
      forks: number
      ageDays: number
      pushedAt?: string
      defaultBranch?: string
    }
  }
}

export const auditDeveloperReputation = async (
  input: ReputationInput
): Promise<ReputationResponse> => {
  const ca = input.claimedCa?.trim() || input.tokenAddress.trim()
  const checks: ReputationCheck[] = []

  const websiteCaFound = input.websiteUrl
    ? await checkWebsiteForCa(input.websiteUrl, ca, checks)
    : false
  const github = input.githubRepoUrl
    ? await checkGithubRepo(input.githubRepoUrl, ca, checks)
    : { caFound: false, metadata: undefined }
  const xCaFound = input.xPostUrl ? await checkXPostForCa(input.xPostUrl, ca, checks) : false

  scoreMarketCap(input.marketCapUsd, checks)
  scoreSocialNarrative(input, checks)

  if (!input.websiteUrl) {
    checks.push({
      name: "Website CA proof",
      status: "warn",
      detail: "No official website URL supplied.",
      weight: -6
    })
  }

  if (!input.githubRepoUrl) {
    checks.push({
      name: "GitHub README proof",
      status: "warn",
      detail: "No GitHub repository URL supplied.",
      weight: -6
    })
  }

  const score = clampScore(50 + checks.reduce((total, check) => total + check.weight, 0))
  const level = score >= 75 ? "strong" : score >= 50 ? "watch" : "weak"

  return {
    score,
    level,
    summary: buildSummary(score, level, websiteCaFound, github.caFound),
    checks,
    evidence: {
      websiteCaFound,
      githubCaFound: github.caFound,
      xCaFound,
      github: github.metadata
    }
  }
}

const checkWebsiteForCa = async (
  websiteUrl: string,
  ca: string,
  checks: ReputationCheck[]
): Promise<boolean> => {
  const html = await fetchText(websiteUrl)

  if (!html) {
    checks.push({
      name: "Website reachable",
      status: "fail",
      detail: "Website could not be fetched by the backend.",
      weight: -8
    })
    return false
  }

  const found = html.includes(ca)
  checks.push({
    name: "Website reachable",
    status: "pass",
    detail: "Website responded to backend fetch.",
    weight: 6
  })
  checks.push({
    name: "CA posted on official website",
    status: found ? "pass" : "fail",
    detail: found
      ? "Claimed contract address appears on the supplied website."
      : "Claimed contract address was not found on the supplied website.",
    weight: found ? 24 : -14
  })

  return found
}

const checkGithubRepo = async (
  githubRepoUrl: string,
  ca: string,
  checks: ReputationCheck[]
): Promise<{
  caFound: boolean
  metadata?: ReputationResponse["evidence"]["github"]
}> => {
  const parsed = parseGithubRepoUrl(githubRepoUrl)

  if (!parsed) {
    checks.push({
      name: "GitHub repository URL",
      status: "fail",
      detail: "GitHub URL must look like https://github.com/owner/repo.",
      weight: -8
    })
    return { caFound: false }
  }

  const repo = await fetchJson<GithubRepo>(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`
  )

  if (!repo) {
    checks.push({
      name: "GitHub repository reachable",
      status: "fail",
      detail: "Repository metadata could not be fetched.",
      weight: -8
    })
    return { caFound: false }
  }

  const readme = await fetchText(
    `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${repo.default_branch}/README.md`
  )
  const caFound = Boolean(readme?.includes(ca))
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(repo.created_at).getTime()) / 86_400_000)
  )
  const recentlyPushed = repo.pushed_at
    ? Date.now() - new Date(repo.pushed_at).getTime() < 1000 * 60 * 60 * 24 * 45
    : false

  checks.push({
    name: "GitHub repository reachable",
    status: "pass",
    detail: `${repo.full_name} exists and is public/readable.`,
    weight: 8
  })
  checks.push({
    name: "CA posted in GitHub README",
    status: caFound ? "pass" : "fail",
    detail: caFound
      ? "Claimed contract address appears in README."
      : "Claimed contract address was not found in README.",
    weight: caFound ? 24 : -12
  })
  checks.push({
    name: "Repository age",
    status: ageDays >= 30 ? "pass" : "warn",
    detail: `Repository age is ${ageDays} days.`,
    weight: ageDays >= 90 ? 10 : ageDays >= 30 ? 6 : -6
  })
  checks.push({
    name: "Repository activity",
    status: recentlyPushed ? "pass" : "warn",
    detail: repo.pushed_at
      ? `Last pushed at ${repo.pushed_at}.`
      : "No pushed_at timestamp returned.",
    weight: recentlyPushed ? 6 : -4
  })
  checks.push({
    name: "Repository social proof",
    status: repo.stargazers_count + repo.forks_count > 0 ? "pass" : "warn",
    detail: `${repo.stargazers_count} stars and ${repo.forks_count} forks.`,
    weight: Math.min(8, repo.stargazers_count + repo.forks_count)
  })

  return {
    caFound,
    metadata: {
      fullName: repo.full_name,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      ageDays,
      pushedAt: repo.pushed_at,
      defaultBranch: repo.default_branch
    }
  }
}

const checkXPostForCa = async (
  xPostUrl: string,
  ca: string,
  checks: ReputationCheck[]
): Promise<boolean> => {
  const urls = buildXProofUrls(xPostUrl)
  let fetchedText = ""

  for (const url of urls) {
    const text = await fetchText(url)
    if (text) {
      fetchedText += `\n${text}`
    }
  }

  if (!fetchedText) {
    checks.push({
      name: "X post CA proof",
      status: "manual",
      detail: "X post URL supplied, but public fetch was blocked or unavailable. Open manually to verify CA.",
      weight: 2
    })
    return false
  }

  const found = fetchedText.includes(ca)
  checks.push({
    name: "X post CA proof",
    status: found ? "pass" : "warn",
    detail: found
      ? "Claimed contract address appears in fetched X/public embed text."
      : "Fetched X/public embed text did not include the claimed contract address.",
    weight: found ? 18 : -4
  })

  return found
}

const scoreMarketCap = (
  marketCapUsd: number | undefined,
  checks: ReputationCheck[]
): void => {
  if (marketCapUsd === undefined) {
    checks.push({
      name: "Market cap threshold",
      status: "manual",
      detail: "No market cap supplied. Use DexScreener/GMGN market cap if available.",
      weight: 0
    })
    return
  }

  checks.push({
    name: "Market cap threshold",
    status: marketCapUsd >= 10_000 ? "pass" : marketCapUsd >= 5_000 ? "warn" : "fail",
    detail: `Market cap supplied: ${formatUsd(marketCapUsd)}.`,
    weight: marketCapUsd >= 10_000 ? 10 : marketCapUsd >= 5_000 ? 4 : -10
  })
}

const scoreSocialNarrative = (input: ReputationInput, checks: ReputationCheck[]): void => {
  const narrative = input.narrative?.toLowerCase() ?? ""
  const notableNames = ["elon musk", "coinbase", "sam altman", "openai", "binance", "solana"]
  const matched = notableNames.filter((name) => narrative.includes(name))

  if (matched.length > 0) {
    checks.push({
      name: "Narrative catalyst",
      status: "manual",
      detail: `Narrative mentions: ${matched.join(", ")}. Treat as manual social proof, not verified endorsement.`,
      weight: Math.min(6, matched.length * 2)
    })
  }
}

const buildXProofUrls = (value: string): string[] => {
  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./, "")
    const urls = [url.toString()]

    if (hostname === "x.com" || hostname === "twitter.com") {
      urls.push(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url.toString())}`)

      const statusId = url.pathname.match(/\/status\/(\d+)/)?.[1]
      if (statusId) {
        urls.push(`https://api.fxtwitter.com/status/${statusId}`)
      }
    }

    return [...new Set(urls)]
  } catch {
    return []
  }
}

const fetchText = async (url: string): Promise<string | null> => {
  if (!isSafePublicHttpUrl(url)) {
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getConfig().providerTimeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "axiom-intelligence/0.1"
      }
    })
    if (!response.ok) return null
    const contentLength = response.headers.get("content-length")
    if (contentLength && Number(contentLength) > 1_000_000) return null

    const text = await response.text()
    return text.slice(0, 1_000_000)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const isSafePublicHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") return false

    const hostname = url.hostname.toLowerCase()
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.")
    ) {
      return false
    }

    const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
    if (ipv4) {
      const first = Number(ipv4[1])
      const second = Number(ipv4[2])
      if (first === 172 && second >= 16 && second <= 31) return false
    }

    return true
  } catch {
    return false
  }
}

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const text = await fetchText(url)
  if (!text) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

type GithubRepo = {
  full_name: string
  default_branch: string
  created_at: string
  pushed_at?: string
  stargazers_count: number
  forks_count: number
}

const parseGithubRepoUrl = (
  value: string
): { owner: string; repo: string } | null => {
  try {
    const url = new URL(value)
    if (url.hostname !== "github.com") return null
    const [owner, repo] = url.pathname.split("/").filter(Boolean)
    if (!owner || !repo) return null
    return { owner, repo: repo.replace(/\.git$/, "") }
  } catch {
    return null
  }
}

const clampScore = (score: number): number => Math.max(1, Math.min(100, Math.round(score)))

const buildSummary = (
  score: number,
  level: ReputationResponse["level"],
  websiteCaFound: boolean,
  githubCaFound: boolean
): string =>
  `Developer reputation is ${level} (${score}/100). CA proof website=${websiteCaFound ? "yes" : "no"}, GitHub README=${githubCaFound ? "yes" : "no"}. Social/narrative evidence is treated as manual review.`

const formatUsd = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value)
