export type AddressKind = "wallet" | "token"

const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const weakRepeatingPattern = /^([1-9A-HJ-NP-Za-km-z])\1+$/

export const isSolanaAddress = (value: string): boolean => {
  const normalized = value.trim()

  if (!base58Pattern.test(normalized)) {
    return false
  }

  if (weakRepeatingPattern.test(normalized)) {
    return false
  }

  return true
}

export const inferAddressKind = (address: string, requestedKind?: string): AddressKind => {
  if (requestedKind === "wallet" || requestedKind === "token") {
    return requestedKind
  }

  const firstChar = address.charCodeAt(0)
  return firstChar % 3 === 0 ? "token" : "wallet"
}
