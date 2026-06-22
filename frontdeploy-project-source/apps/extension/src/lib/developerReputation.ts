import { getApiSettings } from "./storage"

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

export type ReputationInput = {
  tokenAddress: string
  websiteUrl?: string
  githubRepoUrl?: string
  xPostUrl?: string
  narrative?: string
  marketCapUsd?: number
}

export const auditDeveloperReputation = async (
  input: ReputationInput
): Promise<ReputationResponse | null> => {
  const settings = await getApiSettings()

  if (!settings.liveDataEnabled) {
    return null
  }

  const backendUrl = (process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL || "https://frontdeploy-production-15b1.up.railway.app").replace(/\/+$/, "")

  const response = await fetchWithTimeout(
    `${backendUrl}/v1/reputation/developer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  )

  if (!response.ok) {
    return null
  }

  return (await response.json()) as ReputationResponse
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 12_000)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function normalizeBackendUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "")
  return trimmed.length > 0 ? trimmed : "http://127.0.0.1:8787"
}
