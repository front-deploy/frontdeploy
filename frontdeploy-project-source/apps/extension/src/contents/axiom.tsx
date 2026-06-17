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
import type { OverlaySettings } from "../lib/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://axiom.trade/*"],
  run_at: "document_idle"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const PROCESSED_ATTR = "data-axiom-intel-processed"
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "BUTTON", "SELECT"])

let currentSettings: OverlaySettings = {
  overlayEnabled: true,
  showRiskBadges: true
}

async function mountOverlay() {
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
}

function scanDocument() {
  if (!isOverlayVisible(currentSettings)) return

  annotateTokenCards()

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || parent.closest(`[${PROCESSED_ATTR}]`)) {
        return NodeFilter.FILTER_REJECT
      }

      if (SKIP_TAGS.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT
      }

      return detectSolanaAddresses(node.textContent ?? "").length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    }
  })

  const nodes: Text[] = []
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text)
  }

  for (const node of nodes) {
    annotateTextNode(node)
  }
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

function annotateTextNode(node: Text) {
  const text = node.textContent ?? ""
  const detections = detectSolanaAddresses(text)
  if (detections.length === 0 || !node.parentNode) return

  const fragment = document.createDocumentFragment()
  let cursor = 0

  for (const detection of detections) {
    if (detection.start > cursor) {
      fragment.append(document.createTextNode(text.slice(cursor, detection.start)))
    }

    const addressText = document.createElement("span")
    addressText.textContent = detection.address
    addressText.setAttribute(PROCESSED_ATTR, "true")
    fragment.append(addressText)

    const badgeMount = document.createElement("span")
    badgeMount.setAttribute(PROCESSED_ATTR, "true")
    badgeMount.className = "axiom-intel-inline relative inline-flex align-middle"
    fragment.append(badgeMount)
    createRoot(badgeMount).render(<InlineIntelligence detection={detection} />)

    cursor = detection.end
  }

  if (cursor < text.length) {
    fragment.append(document.createTextNode(text.slice(cursor)))
  }

  node.parentNode.replaceChild(fragment, node)
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
            void chrome.runtime.sendMessage({
              type: "AXIOM_INTEL_OPEN_SIDE_PANEL"
            })
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
