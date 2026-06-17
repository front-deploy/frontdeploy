const BASE58_ADDRESS_PATTERN = /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/g

const COMMON_FALSE_POSITIVES = new Set([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112"
])

export type SolanaAddressType = "wallet" | "token"

export interface DetectedSolanaAddress {
  address: string
  type: SolanaAddressType
  start: number
  end: number
}

export function detectSolanaAddresses(text: string): DetectedSolanaAddress[] {
  const matches = text.matchAll(BASE58_ADDRESS_PATTERN)
  const seen = new Set<string>()
  const detected: DetectedSolanaAddress[] = []

  for (const match of matches) {
    const address = match[0]
    const start = match.index ?? 0

    if (!isLikelySolanaAddress(address) || seen.has(`${address}:${start}`)) {
      continue
    }

    seen.add(`${address}:${start}`)
    detected.push({
      address,
      type: inferAddressType(address, text, start),
      start,
      end: start + address.length
    })
  }

  return detected
}

export function isLikelySolanaAddress(value: string): boolean {
  if (value.length < 32 || value.length > 44) return false
  if (COMMON_FALSE_POSITIVES.has(value)) return false
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) return false
  if (/^(.)\1{16,}$/.test(value)) return false
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value)) return false

  return true
}

function inferAddressType(
  address: string,
  context: string,
  start: number
): SolanaAddressType {
  const windowStart = Math.max(0, start - 40)
  const windowEnd = Math.min(context.length, start + address.length + 40)
  const nearbyText = context.slice(windowStart, windowEnd).toLowerCase()

  if (nearbyText.includes("token") || nearbyText.includes("mint")) {
    return "token"
  }

  return "wallet"
}
