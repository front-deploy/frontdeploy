import type { SolanaAddressType } from "./detectSolanaAddress"
import type { AxiomTokenContext } from "./axiomTokenContext"
import type { XReplyContext } from "./xLaunchContext"
import { hasExtensionContext, isContextInvalidated } from "./extensionContext"

export interface OverlaySettings {
  overlayEnabled: boolean
  showRiskBadges: boolean
}

export interface ApiSettings {
  liveDataEnabled: boolean
  backendUrl: string
}

export interface SelectedAddress {
  address: string
  type: SolanaAddressType
  context?: AxiomTokenContext
}

const LABELS_KEY = "axiomIntelligence.labels"
const SETTINGS_KEY = "axiomIntelligence.settings"
const API_SETTINGS_KEY = "axiomIntelligence.apiSettings"
const SELECTED_KEY = "axiomIntelligence.selected"
const LAUNCH_CONTEXT_KEY = "axiomIntelligence.launchContext"
const LAUNCH_SETTINGS_KEY = "axiomIntelligence.launchSettings"
const WALLET_SESSION_KEY = "axiomIntelligence.walletSession"

export interface WalletSession {
  connected: boolean
  publicKey: string
  provider: "phantom" | "solflare" | "backpack" | ""
}

export interface LaunchSettings {
  ipfsProvider: "pumpfun"
  pinataJwt?: string
  rpcUrl?: string
  devBuySol: number
  slippage: number
  priorityFee: number
}

const DEFAULT_SETTINGS: OverlaySettings = {
  overlayEnabled: true,
  showRiskBadges: true
}

const DEFAULT_API_SETTINGS: ApiSettings = {
  liveDataEnabled: true,
  backendUrl: process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL || "http://127.0.0.1:8080"
}

const DEFAULT_LAUNCH_SETTINGS: LaunchSettings = {
  ipfsProvider: "pumpfun",
  devBuySol: 0,
  slippage: 5,
  priorityFee: 0.0005
}

type LabelMap = Record<string, string>

export async function getLabels(): Promise<LabelMap> {
  const value = await getStorageValue<LabelMap>(LABELS_KEY)
  return value ?? {}
}

export async function getLabel(address: string): Promise<string | null> {
  const labels = await getLabels()
  return labels[address] ?? null
}

export async function saveLabel(address: string, label: string): Promise<void> {
  const labels = await getLabels()
  const trimmedLabel = label.trim()

  if (trimmedLabel.length === 0) {
    delete labels[address]
  } else {
    labels[address] = trimmedLabel
  }

  await setStorageValue(LABELS_KEY, labels)
}

export async function getSettings(): Promise<OverlaySettings> {
  const value = await getStorageValue<Partial<OverlaySettings>>(SETTINGS_KEY)
  return {
    ...DEFAULT_SETTINGS,
    ...value
  }
}

export async function saveSettings(settings: OverlaySettings): Promise<void> {
  await setStorageValue(SETTINGS_KEY, settings)
}

export async function getApiSettings(): Promise<ApiSettings> {
  const value = await getStorageValue<Partial<ApiSettings>>(API_SETTINGS_KEY)
  return {
    ...DEFAULT_API_SETTINGS,
    ...value
  }
}

export async function saveApiSettings(settings: ApiSettings): Promise<void> {
  await setStorageValue(API_SETTINGS_KEY, settings)
}

export async function getSelectedAddress(): Promise<SelectedAddress | null> {
  return (await getStorageValue<SelectedAddress>(SELECTED_KEY)) ?? null
}

export async function saveSelectedAddress(selected: SelectedAddress): Promise<void> {
  await setStorageValue(SELECTED_KEY, selected)
}

export async function getSelectedLaunchContext(): Promise<XReplyContext | null> {
  return (await getStorageValue<XReplyContext>(LAUNCH_CONTEXT_KEY)) ?? null
}

export async function saveSelectedLaunchContext(context: XReplyContext): Promise<void> {
  await setStorageValue(LAUNCH_CONTEXT_KEY, context)
}

export async function getLaunchSettings(): Promise<LaunchSettings> {
  const value = await getStorageValue<Partial<LaunchSettings>>(LAUNCH_SETTINGS_KEY)
  return {
    ...DEFAULT_LAUNCH_SETTINGS,
    ...value
  }
}

export async function saveLaunchSettings(settings: LaunchSettings): Promise<void> {
  await setStorageValue(LAUNCH_SETTINGS_KEY, settings)
}

export async function getWalletSession(): Promise<WalletSession | null> {
  return (await getStorageValue<WalletSession>(WALLET_SESSION_KEY)) ?? null
}

export async function saveWalletSession(session: WalletSession | null): Promise<void> {
  if (session === null) {
    if (!hasExtensionContext()) return
    try {
      await chrome.storage.local.remove(WALLET_SESSION_KEY)
    } catch (err) {
      if (!isContextInvalidated(err)) console.warn("storage.remove error", err)
    }
  } else {
    await setStorageValue(WALLET_SESSION_KEY, session)
  }
}

async function getStorageValue<T>(key: string): Promise<T | undefined> {
  if (!hasExtensionContext()) return undefined

  try {
    const result = await chrome.storage.local.get(key)
    return result[key] as T | undefined
  } catch (err) {
    if (!isContextInvalidated(err)) {
      console.warn("storage.get error", err)
    }
    return undefined
  }
}

async function setStorageValue<T>(key: string, value: T): Promise<void> {
  if (!hasExtensionContext()) return

  try {
    await chrome.storage.local.set({ [key]: value })
  } catch (err) {
    if (!isContextInvalidated(err)) {
      console.warn("storage.set error", err)
    }
  }
}
