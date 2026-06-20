import type { PlasmoCSConfig } from "plasmo"
import cssText from "data-text:~style.css"
import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import { WalletBadge } from "../components/WalletBadge"
import { WalletTooltip } from "../components/WalletTooltip"
import {
  detectSolanaAddresses,
  type DetectedSolanaAddress
} from "../lib/detectSolanaAddress"
import { ChartOverlay } from "../components/ChartOverlay"
import {
  findAxiomTokenCards,
  markTokenCardProcessed,
  type AxiomTokenContext
} from "../lib/axiomTokenContext"
import {
  auditDeveloperReputation,
  type ReputationResponse
} from "../lib/developerReputation"
import { getAddressIntelligence } from "../lib/liveIntelligence"
import { getMockIntelligence } from "../lib/mockIntelligence"
import type { AddressIntelligence } from "../lib/mockIntelligence"
import { getLabel, getSettings, saveSelectedAddress } from "../lib/storage"
import { getWalletStatus } from "../lib/popup-api"
import { checkTokenGate } from "../lib/tokenGate"
import type { OverlaySettings } from "../lib/storage"
import { hasExtensionContext, isContextInvalidated } from "../lib/extensionContext"

export const config: PlasmoCSConfig = {
  matches: ["https://axiom.trade/*"],
  run_at: "document_idle"
}



const PROCESSED_ATTR = "data-axiom-intel-processed"
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "BUTTON", "SELECT"])

let currentSettings: OverlaySettings = {
  overlayEnabled: true,
  showRiskBadges: true
}

async function mountOverlay() {
  if (document.head && !document.querySelector("[data-axiom-intel-style]")) {
    const style = document.createElement("style")
    style.setAttribute("data-axiom-intel-style", "true")
    style.textContent = cssText
    document.head.append(style)
  }

  try {
    const session = await getWalletStatus()
    const gate = await checkTokenGate(session?.publicKey)
    if (!gate.isAllowed) {
      console.info("[Frontdeploy] Token gate not passed. Overlay disabled on Axiom.")
      return
    }
  } catch (err) {
    console.warn("[Frontdeploy] Failed to verify token gate:", err)
    return
  }

  currentSettings = await getSettings()
  applyOverlayVisibility(currentSettings)

  if (isOverlayVisible(currentSettings)) {
    scanDocument()
  }

  const observer = new MutationObserver(() => {
    if (!isOverlayVisible(currentSettings)) return

    window.requestIdleCallback?.(() => scanDocument()) ??
      window.setTimeout(() => scanDocument(), 100)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  if (hasExtensionContext()) {
    try {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes["axiomIntelligence.settings"]) return

        void getSettings().then((settings) => {
          currentSettings = settings
          applyOverlayVisibility(settings)

          if (isOverlayVisible(settings)) {
            scanDocument()
          }
        })
      })
    } catch (err) {
      if (!isContextInvalidated(err)) console.warn(err)
    }
  }
}

let activeChartMint: string | null = null
let chartOverlayElement: HTMLElement | null = null

function checkChartPage() {
  if (!isOverlayVisible(currentSettings)) {
    if (chartOverlayElement) {
      chartOverlayElement.remove()
      chartOverlayElement = null
      activeChartMint = null
    }
    return
  }

  // Axiom trade token URL format usually includes the mint
  // e.g., https://axiom.trade/token/2vCw...pump or /meme/2vCw...pump
  const match = window.location.href.match(/\/(?:token|meme)\/([1-9A-HJ-NP-Za-km-z]{32,44})/) || window.location.href.match(/token=([1-9A-HJ-NP-Za-km-z]{32,44})/)
  const mint = match ? match[1] : null

  if (mint && mint !== activeChartMint) {
    // Clean up old overlay if exists
    if (chartOverlayElement) {
      chartOverlayElement.remove()
    }
    
    activeChartMint = mint
    chartOverlayElement = document.createElement("div")
    chartOverlayElement.id = "axiom-chart-overlay-root"
    document.body.appendChild(chartOverlayElement)
    
    createRoot(chartOverlayElement).render(<ChartOverlay mintAddress={mint} />)
  } else if (!mint && activeChartMint) {
    if (chartOverlayElement) {
      chartOverlayElement.remove()
      chartOverlayElement = null
    }
    activeChartMint = null
  }
}

function scanDocument() {
  checkChartPage()

  if (!isOverlayVisible(currentSettings)) return

  annotateTokenCards()

  // NOTE: We no longer scan and mutate random text nodes via TreeWalker.
  // Replacing TextNodes with DocumentFragments causes Axiom's React 18 reconciliation to crash 
  // with a "NotFoundError" when it attempts to unmount or update those nodes, leading to a blank white screen.
}

function annotateTokenCards() {
  for (const { element, context } of findAxiomTokenCards()) {
    markTokenCardProcessed(element, context.address)

    const computedPosition = window.getComputedStyle(element).position
    if (computedPosition === "static") {
      element.style.position = "relative"
    }

    const badgeMount = document.createElement("span")
    badgeMount.setAttribute(PROCESSED_ATTR, "true")
    badgeMount.className = "axiom-intel-inline absolute right-2 top-2 z-[2147483646] inline-flex"
    element.append(badgeMount)

    createRoot(badgeMount).render(
      <InlineIntelligence
        detection={{
          address: context.address,
          type: "token",
          start: 0,
          end: context.address.length
        }}
        context={context}
      />
    )
  }
}

function isOverlayVisible(settings: OverlaySettings) {
  return settings.overlayEnabled && settings.showRiskBadges
}

function applyOverlayVisibility(settings: OverlaySettings) {
  const display = isOverlayVisible(settings) ? "inline-flex" : "none"
  document.querySelectorAll<HTMLElement>(".axiom-intel-inline").forEach((element) => {
    element.style.display = display
  })
}

function InlineIntelligence({
  detection,
  context
}: {
  detection: DetectedSolanaAddress
  context?: AxiomTokenContext
}) {
  const [label, setLabel] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [reputation, setReputation] = useState<ReputationResponse | null>(null)
  const [reputationLoading, setReputationLoading] = useState(false)
  const [intelligence, setIntelligence] = useState<AddressIntelligence>(() =>
    getMockIntelligence(detection.address, detection.type)
  )

  useEffect(() => {
    void getLabel(detection.address).then(setLabel)
  }, [detection.address])

  useEffect(() => {
    let active = true

    void getAddressIntelligence(detection.address, detection.type).then((nextIntelligence) => {
      if (active) setIntelligence(nextIntelligence)
    })

    return () => {
      active = false
    }
  }, [detection.address, detection.type])

  useEffect(() => {
    if (!open || detection.type !== "token" || !context || reputation || reputationLoading) {
      return
    }

    const hasEvidence =
      Boolean(context.websiteUrl) ||
      Boolean(context.githubRepoUrl) ||
      Boolean(context.xPostUrl) ||
      context.marketCapUsd !== undefined

    if (!hasEvidence) return

    let active = true
    setReputationLoading(true)

    void auditDeveloperReputation({
      tokenAddress: context.address,
      ...(context.websiteUrl ? { websiteUrl: context.websiteUrl } : {}),
      ...(context.githubRepoUrl ? { githubRepoUrl: context.githubRepoUrl } : {}),
      ...(context.xPostUrl ? { xPostUrl: context.xPostUrl } : {}),
      ...(context.narrative ? { narrative: context.narrative } : {}),
      ...(context.marketCapUsd !== undefined ? { marketCapUsd: context.marketCapUsd } : {})
    })
      .then((nextReputation) => {
        if (active) setReputation(nextReputation)
      })
      .finally(() => {
        if (active) setReputationLoading(false)
      })

    return () => {
      active = false
    }
  }, [context, detection.type, open, reputation, reputationLoading])

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}>
      <WalletBadge
        label={intelligence.badge}
        riskLevel={intelligence.risk.level}
        onClick={() => {
          void saveSelectedAddress({
            address: detection.address,
            type: detection.type,
            ...(context ? { context } : {})
          }).then(() => {
            if (hasExtensionContext()) {
              chrome.runtime.sendMessage({
                type: "AXIOM_INTEL_OPEN_SIDE_PANEL"
              }).catch((err) => {
                if (!isContextInvalidated(err)) console.warn(err)
              })
            }
          })
        }}
      />
      {open ? (
        <span className="absolute left-0 top-6 z-[2147483647]">
          <WalletTooltip
            intelligence={intelligence}
            userLabel={label}
            tokenContext={context}
            reputation={reputation}
            reputationLoading={reputationLoading}
          />
        </span>
      ) : null}
    </span>
  )
}

void mountOverlay()

export default function AxiomCSUI() {
  return null
}
