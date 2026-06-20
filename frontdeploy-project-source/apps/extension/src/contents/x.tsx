import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"

import {
  buildChatGptLogoUrl,
  buildPumpFunCreateUrl,
  createLaunchDraft,
  extractXReplyContext,
  findXReplyArticles,
  type LaunchDraft,
  type XReplyContext
} from "../lib/xLaunchContext"
import { getWalletSession, saveSelectedLaunchContext } from "../lib/storage"
import { checkTokenGate } from "../lib/tokenGate"
import { WalletButton } from "../components/XWalletButton"
import { FastLaunch } from "../components/XFastLaunch"

export const config: PlasmoCSConfig = {
  matches: [
    "https://x.com/*",
    "https://*.x.com/*",
    "https://twitter.com/*",
    "https://*.twitter.com/*"
  ],
  run_at: "document_idle"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = LAUNCH_RADAR_CSS
  return style
}

const PROCESSED_ATTR = "data-axiom-launch-processed"
const RADAR_ROOT_ATTR = "data-axiom-launch-dock"

function mountXLaunchScanner() {
  injectLaunchRadarStyles()
  mountFloatingDock()
  wireActiveTweetTracking()
  scanTweets()

  const observer = new MutationObserver(() => {
    window.requestIdleCallback?.(() => scanTweets()) ?? window.setTimeout(scanTweets, 120)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function injectLaunchRadarStyles() {
  if (!document.head) return
  if (document.querySelector("[data-axiom-launch-style]")) return

  const style = document.createElement("style")
  style.setAttribute("data-axiom-launch-style", "true")
  style.textContent = LAUNCH_RADAR_CSS
  document.head.append(style)
}

function mountFloatingDock() {
  if (document.querySelector(`[${RADAR_ROOT_ATTR}]`)) return
  if (!document.body) return

  const mount = document.createElement("div")
  mount.setAttribute(RADAR_ROOT_ATTR, "true")
  mount.style.position = "fixed"
  mount.style.right = "16px"
  mount.style.bottom = "16px"
  mount.style.zIndex = "2147483647"
  mount.style.width = "360px"
  mount.style.maxWidth = "calc(100vw - 32px)"
  mount.style.pointerEvents = "auto"
  mount.innerHTML = `
    <div style="background:#fff;border:1px solid #111;color:#111;font-family:Arial,sans-serif;padding:12px;border-radius:2px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b6b66">Frontdeploy</div>
      <div style="margin-top:4px;font-size:14px;font-weight:700">Scanning X...</div>
    </div>
  `
  document.body.append(mount)
  createRoot(mount).render(<XLaunchDock />)
}

function wireActiveTweetTracking() {
  const handlePointerEvent = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const article = target.closest("article")
    if (!(article instanceof HTMLElement)) return

    const context = extractXReplyContext(article)
    if (!context) return

    emitLaunchContext(context)
  }

  for (const eventName of ["mouseover", "pointerover", "focusin", "click"]) {
    document.addEventListener(eventName, handlePointerEvent, { passive: true })
  }
}

function emitLaunchContext(context: XReplyContext) {
  void saveSelectedLaunchContext(context)
  window.dispatchEvent(
    new CustomEvent<XReplyContext>("axiom-launch-context", {
      detail: context
    })
  )
}

function scanTweets() {
  const articles = findXReplyArticles()

  for (const article of articles) {
    const context = extractXReplyContext(article)
    if (!context) continue

    if (!window.__AXIOM_LAUNCH_RADAR_ACTIVE_CONTEXT__) {
      window.__AXIOM_LAUNCH_RADAR_ACTIVE_CONTEXT__ = context
      emitLaunchContext(context)
    }

    article.setAttribute(PROCESSED_ATTR, "true")
    const mount = document.createElement("div")
    mount.className = "axiom-x-launch-mount"
    article.append(mount)
    createRoot(mount).render(<XLaunchPanel context={context} />)
  }
}

declare global {
  interface Window {
    __AXIOM_LAUNCH_RADAR_BOOTED__?: boolean
    __AXIOM_LAUNCH_RADAR_ACTIVE_CONTEXT__?: XReplyContext
  }
}

function startWhenReady() {
  if (window.__AXIOM_LAUNCH_RADAR_BOOTED__) return
  window.__AXIOM_LAUNCH_RADAR_BOOTED__ = true

  const start = async () => {
    if (!document.body) {
      window.setTimeout(start, 100)
      return
    }

    try {
      const session = await getWalletSession()
      const gate = await checkTokenGate(session?.publicKey)
      if (!gate.isAllowed) {
        console.info("[Frontdeploy] Token gate not passed. Radar disabled on X.")
        return
      }
      mountXLaunchScanner()
    } catch (err) {
      console.warn("[Frontdeploy] Failed to verify token gate:", err)
    }
  }

  start()
}

function XLaunchPanel({ context }: { context: XReplyContext }) {
  const draft = useMemo(() => createLaunchDraft(context), [context])
  const [expanded, setExpanded] = useState(context.influence === "major")
  const [copied, setCopied] = useState("")

  async function copyText(label: string, value: string) {
    await copyToClipboard(value)
    setCopied(label)
    window.setTimeout(() => setCopied(""), 1500)
  }

  return (
    <aside className="mx-4 mb-3 mt-2 rounded-sm border border-axiom-border bg-white p-3 text-axiom-text shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-axiom-muted">Frontdeploy</p>
          <h2 className="mt-1 text-sm font-bold">
            @{context.handle} {context.influence === "major" ? "major account" : "reply signal"}
          </h2>
        </div>
        <button
          type="button"
          className="rounded-sm border border-axiom-border px-2 py-1 text-xs font-bold text-axiom-text"
          onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Hide" : "Draft"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <LaunchMetric label="Name" value={draft.tokenName} />
            <LaunchMetric label="Ticker" value={`$${draft.ticker}`} />
            <LaunchMetric label="Confidence" value={draft.confidence} />
            <LaunchMetric label="Source" value="X reply" />
          </div>

          <p className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5 text-axiom-muted">
            {context.text}
          </p>

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void copyText("metadata", formatMetadata(draft))}>
              Copy metadata
            </ActionButton>
            <ActionButton onClick={() => void copyText("logo prompt", draft.logoPrompt)}>
              Copy logo prompt
            </ActionButton>
            <ActionButton onClick={() => openLaunchPage(draft)}>
              Open pump.fun
            </ActionButton>
          </div>

          {copied ? <p className="text-xs font-semibold text-axiom-good">Copied {copied}</p> : null}

          <div className="mt-3 border-t border-axiom-border pt-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase text-axiom-muted mb-1">Direct Launch</h3>
            <WalletButton />
            <FastLaunch initialDraft={{ name: draft.tokenName, symbol: draft.ticker, description: draft.description, twitter: draft.sourceUrl }} />
          </div>

          <ul className="space-y-1 border-t border-axiom-border pt-2">
            {draft.warnings.map((warning) => (
              <li key={warning} className="text-[11px] leading-4 text-axiom-muted">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}

function XLaunchDock() {
  const [context, setContext] = useState<XReplyContext | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [copied, setCopied] = useState("")
  const draft = useMemo(() => (context ? createLaunchDraft(context) : null), [context])

  useEffect(() => {
    const handleContext = (event: Event) => {
      const nextContext = (event as CustomEvent<XReplyContext>).detail
      setContext(nextContext)
      if (nextContext.influence === "major") {
        setMinimized(false)
      }
    }

    window.addEventListener("axiom-launch-context", handleContext)
    return () => window.removeEventListener("axiom-launch-context", handleContext)
  }, [])

  async function copyText(label: string, value: string) {
    await copyToClipboard(value)
    setCopied(label)
    window.setTimeout(() => setCopied(""), 1500)
  }

  async function openLogoGenerator() {
    if (!draft) return

    window.open(buildChatGptLogoUrl(draft), "_blank", "noopener,noreferrer")
    await copyText("logo prompt", draft.logoPrompt)
  }

  if (!context || !draft) {
    return (
      <div className="fixed bottom-4 right-4 z-[2147483647] w-80 rounded-sm border border-axiom-border bg-white p-3 text-axiom-text shadow-none">
        <p className="text-xs font-bold uppercase text-axiom-muted">Frontdeploy</p>
        <p className="mt-1 text-sm font-semibold">Hover an X reply to draft a pump.fun launch.</p>
      </div>
    )
  }

  if (minimized) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-[2147483647] rounded-sm bg-axiom-accent px-3 py-2 text-sm font-bold text-white shadow-none"
        onClick={() => setMinimized(false)}>
        Launch radar
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[2147483647] w-[360px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-sm border border-axiom-border bg-white p-3 text-axiom-text shadow-none flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-axiom-muted">Frontdeploy</p>
          <h2 className="mt-1 text-base font-bold leading-tight">
            {draft.tokenName} <span className="text-axiom-accent">${draft.ticker}</span>
          </h2>
          <p className="mt-1 text-xs text-axiom-muted">
            @{context.handle} - {context.influence === "major" ? "major account" : "reply signal"}
          </p>
        </div>
        <button
          type="button"
          className="rounded-sm border border-axiom-border px-2 py-1 text-xs font-bold text-axiom-text"
          onClick={() => setMinimized(true)}>
          Min
        </button>
      </div>

      <p className="mt-3 max-h-20 overflow-hidden rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5 text-axiom-muted">
        {context.text}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <LaunchMetric label="Name" value={draft.tokenName} />
        <LaunchMetric label="Ticker" value={`$${draft.ticker}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton onClick={() => void copyText("name", draft.tokenName)}>
          Copy name
        </ActionButton>
        <ActionButton onClick={() => void copyText("ticker", draft.ticker)}>
          Copy ticker
        </ActionButton>
        <ActionButton onClick={() => void copyText("X link", draft.sourceUrl)}>
          Copy X link
        </ActionButton>
        <ActionButton onClick={() => void copyText("metadata", formatMetadata(draft))}>
          Copy all
        </ActionButton>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <ActionButton onClick={() => void openLogoGenerator()}>
          Logo via GPT
        </ActionButton>
        <ActionButton onClick={() => openLaunchPage(draft)}>
          Deploy page
        </ActionButton>
      </div>

      {copied ? <p className="mt-2 text-xs font-semibold text-axiom-good">Copied {copied}</p> : null}

      <div className="mt-3 border-t border-axiom-border pt-3 flex flex-col gap-2 shrink-0">
        <h3 className="text-xs font-bold uppercase text-axiom-muted mb-1">Direct Launch</h3>
        <WalletButton />
        <FastLaunch initialDraft={{ name: draft.tokenName, symbol: draft.ticker, description: draft.description, twitter: draft.sourceUrl }} />
      </div>

      <p className="mt-2 border-t border-axiom-border pt-2 text-[11px] leading-4 text-axiom-muted shrink-0">
        Manual launch only. Frontdeploy never connects wallet, requests SOL, or sends transactions.
      </p>

      <button
        type="button"
        className="mt-3 w-full shrink-0 rounded-sm border border-axiom-border px-2 py-2 text-xs font-bold text-axiom-text hover:bg-axiom-bg transition"
        onClick={() => setMinimized(true)}>
        Hide / Minimize
      </button>
    </div>
  )
}

function LaunchMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-axiom-border bg-axiom-bg p-2">
      <p className="font-bold uppercase text-axiom-muted">{label}</p>
      <p className="mt-1 truncate font-semibold text-axiom-text">{value}</p>
    </div>
  )
}

function ActionButton({
  children,
  onClick
}: {
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="rounded-sm bg-axiom-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-axiom-muted"
      onClick={onClick}>
      {children}
    </button>
  )
}

function formatMetadata(draft: LaunchDraft): string {
  return [
    `Name: ${draft.tokenName}`,
    `Ticker: ${draft.ticker}`,
    `Description: ${draft.description}`,
    `Source X reply: ${draft.sourceUrl}`,
    `Logo prompt: ${draft.logoPrompt}`
  ].join("\n")
}

function openLaunchPage(draft: LaunchDraft) {
  window.open(buildPumpFunCreateUrl(draft), "_blank", "noopener,noreferrer")
}

async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = value
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    textarea.style.top = "0"
    document.body.append(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand("copy")
    textarea.remove()
  }
}

const LAUNCH_RADAR_CSS = `
[data-axiom-launch-dock],
.axiom-x-launch-mount {
  font-family: "Helvetica Neue", Arial, Inter, ui-sans-serif, system-ui, sans-serif;
  color: #111111;
}

[data-axiom-launch-dock] *,
.axiom-x-launch-mount * {
  box-sizing: border-box;
}

[data-axiom-launch-dock] .fixed { position: fixed; }
[data-axiom-launch-dock] .bottom-4 { bottom: 16px; }
[data-axiom-launch-dock] .right-4 { right: 16px; }
[data-axiom-launch-dock] .z-\\[2147483647\\] { z-index: 2147483647; }
[data-axiom-launch-dock] .w-80 { width: 320px; }
[data-axiom-launch-dock] .w-\\[360px\\] { width: 360px; }
[data-axiom-launch-dock] .max-w-\\[calc\\(100vw-2rem\\)\\] { max-width: calc(100vw - 32px); }
[data-axiom-launch-dock] .rounded-sm,
.axiom-x-launch-mount .rounded-sm { border-radius: 2px; }
[data-axiom-launch-dock] .border,
.axiom-x-launch-mount .border { border-width: 1px; border-style: solid; }
[data-axiom-launch-dock] .border-axiom-border,
.axiom-x-launch-mount .border-axiom-border { border-color: #111111; }
[data-axiom-launch-dock] .bg-white,
.axiom-x-launch-mount .bg-white { background: #ffffff; }
[data-axiom-launch-dock] .bg-axiom-bg,
.axiom-x-launch-mount .bg-axiom-bg { background: #f7f7f2; }
[data-axiom-launch-dock] .bg-axiom-accent,
.axiom-x-launch-mount .bg-axiom-accent { background: #111111; }
[data-axiom-launch-dock] .text-white,
.axiom-x-launch-mount .text-white { color: #ffffff; }
[data-axiom-launch-dock] .text-axiom-text,
.axiom-x-launch-mount .text-axiom-text { color: #111111; }
[data-axiom-launch-dock] .text-axiom-muted,
.axiom-x-launch-mount .text-axiom-muted { color: #6b6b66; }
[data-axiom-launch-dock] .text-axiom-accent,
.axiom-x-launch-mount .text-axiom-accent { color: #111111; }
[data-axiom-launch-dock] .text-axiom-good,
.axiom-x-launch-mount .text-axiom-good { color: #008f5a; }
[data-axiom-launch-dock] .p-2,
.axiom-x-launch-mount .p-2 { padding: 8px; }
[data-axiom-launch-dock] .p-3,
.axiom-x-launch-mount .p-3 { padding: 12px; }
[data-axiom-launch-dock] .px-2,
.axiom-x-launch-mount .px-2 { padding-left: 8px; padding-right: 8px; }
[data-axiom-launch-dock] .px-3,
.axiom-x-launch-mount .px-3 { padding-left: 12px; padding-right: 12px; }
[data-axiom-launch-dock] .py-1,
.axiom-x-launch-mount .py-1 { padding-top: 4px; padding-bottom: 4px; }
[data-axiom-launch-dock] .py-2,
.axiom-x-launch-mount .py-2 { padding-top: 8px; padding-bottom: 8px; }
[data-axiom-launch-dock] .m-0,
.axiom-x-launch-mount .m-0 { margin: 0; }
[data-axiom-launch-dock] .mx-4,
.axiom-x-launch-mount .mx-4 { margin-left: 16px; margin-right: 16px; }
[data-axiom-launch-dock] .mb-3,
.axiom-x-launch-mount .mb-3 { margin-bottom: 12px; }
[data-axiom-launch-dock] .mt-1,
.axiom-x-launch-mount .mt-1 { margin-top: 4px; }
[data-axiom-launch-dock] .mt-2,
.axiom-x-launch-mount .mt-2 { margin-top: 8px; }
[data-axiom-launch-dock] .mt-3,
.axiom-x-launch-mount .mt-3 { margin-top: 12px; }
[data-axiom-launch-dock] .flex,
.axiom-x-launch-mount .flex { display: flex; }
[data-axiom-launch-dock] .grid,
.axiom-x-launch-mount .grid { display: grid; }
[data-axiom-launch-dock] .grid-cols-2,
.axiom-x-launch-mount .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
[data-axiom-launch-dock] .items-start,
.axiom-x-launch-mount .items-start { align-items: flex-start; }
[data-axiom-launch-dock] .items-center,
.axiom-x-launch-mount .items-center { align-items: center; }
[data-axiom-launch-dock] .justify-between,
.axiom-x-launch-mount .justify-between { justify-content: space-between; }
[data-axiom-launch-dock] .flex-wrap,
.axiom-x-launch-mount .flex-wrap { flex-wrap: wrap; }
[data-axiom-launch-dock] .gap-2,
.axiom-x-launch-mount .gap-2 { gap: 8px; }
[data-axiom-launch-dock] .gap-3,
.axiom-x-launch-mount .gap-3 { gap: 12px; }
[data-axiom-launch-dock] .space-y-1 > * + *,
.axiom-x-launch-mount .space-y-1 > * + * { margin-top: 4px; }
[data-axiom-launch-dock] .space-y-3 > * + *,
.axiom-x-launch-mount .space-y-3 > * + * { margin-top: 12px; }
[data-axiom-launch-dock] .border-t,
.axiom-x-launch-mount .border-t { border-top-width: 1px; border-top-style: solid; }
[data-axiom-launch-dock] .pt-2,
.axiom-x-launch-mount .pt-2 { padding-top: 8px; }
[data-axiom-launch-dock] .text-\\[11px\\],
.axiom-x-launch-mount .text-\\[11px\\] { font-size: 11px; }
[data-axiom-launch-dock] .text-xs,
.axiom-x-launch-mount .text-xs { font-size: 12px; }
[data-axiom-launch-dock] .text-sm,
.axiom-x-launch-mount .text-sm { font-size: 14px; }
[data-axiom-launch-dock] .text-base,
.axiom-x-launch-mount .text-base { font-size: 16px; }
[data-axiom-launch-dock] .font-semibold,
.axiom-x-launch-mount .font-semibold { font-weight: 600; }
[data-axiom-launch-dock] .font-bold,
.axiom-x-launch-mount .font-bold { font-weight: 700; }
[data-axiom-launch-dock] .uppercase,
.axiom-x-launch-mount .uppercase { text-transform: uppercase; }
[data-axiom-launch-dock] .leading-4,
.axiom-x-launch-mount .leading-4 { line-height: 16px; }
[data-axiom-launch-dock] .leading-5,
.axiom-x-launch-mount .leading-5 { line-height: 20px; }
[data-axiom-launch-dock] .leading-tight,
.axiom-x-launch-mount .leading-tight { line-height: 1.25; }
[data-axiom-launch-dock] .truncate,
.axiom-x-launch-mount .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
[data-axiom-launch-dock] .overflow-hidden,
.axiom-x-launch-mount .overflow-hidden { overflow: hidden; }
[data-axiom-launch-dock] .max-h-20 { max-height: 80px; }
[data-axiom-launch-dock] .shadow-none,
.axiom-x-launch-mount .shadow-none { box-shadow: none; }
[data-axiom-launch-dock] button,
.axiom-x-launch-mount button {
  border: 1px solid #111111;
  cursor: pointer;
  font: inherit;
}
[data-axiom-launch-dock] button:hover,
.axiom-x-launch-mount button:hover {
  background: #6b6b66;
}
[data-axiom-launch-dock] .flex-col, .axiom-x-launch-mount .flex-col { flex-direction: column; }
[data-axiom-launch-dock] .gap-1, .axiom-x-launch-mount .gap-1 { gap: 4px; }
[data-axiom-launch-dock] .w-full, .axiom-x-launch-mount .w-full { width: 100%; }
[data-axiom-launch-dock] .w-16, .axiom-x-launch-mount .w-16 { width: 64px; }
[data-axiom-launch-dock] .h-16, .axiom-x-launch-mount .h-16 { height: 64px; }
[data-axiom-launch-dock] .w-2, .axiom-x-launch-mount .w-2 { width: 8px; }
[data-axiom-launch-dock] .h-2, .axiom-x-launch-mount .h-2 { height: 8px; }
[data-axiom-launch-dock] .flex-1, .axiom-x-launch-mount .flex-1 { flex: 1 1 0%; }
[data-axiom-launch-dock] .min-h-\\[60px\\], .axiom-x-launch-mount .min-h-\\[60px\\] { min-height: 60px; }
[data-axiom-launch-dock] .object-cover, .axiom-x-launch-mount .object-cover { object-fit: cover; }
[data-axiom-launch-dock] .cursor-pointer, .axiom-x-launch-mount .cursor-pointer { cursor: pointer; }
[data-axiom-launch-dock] .rounded, .axiom-x-launch-mount .rounded { border-radius: 4px; }
[data-axiom-launch-dock] .rounded-full, .axiom-x-launch-mount .rounded-full { border-radius: 9999px; }
[data-axiom-launch-dock] .bg-axiom-bad\\/10, .axiom-x-launch-mount .bg-axiom-bad\\/10 { background-color: rgba(225, 29, 72, 0.1); }
[data-axiom-launch-dock] .bg-axiom-good\\/10, .axiom-x-launch-mount .bg-axiom-good\\/10 { background-color: rgba(0, 143, 90, 0.1); }
[data-axiom-launch-dock] .border-axiom-bad\\/20, .axiom-x-launch-mount .border-axiom-bad\\/20 { border-color: rgba(225, 29, 72, 0.2); }
[data-axiom-launch-dock] .border-axiom-good\\/20, .axiom-x-launch-mount .border-axiom-good\\/20 { border-color: rgba(0, 143, 90, 0.2); }
[data-axiom-launch-dock] .text-axiom-bad, .axiom-x-launch-mount .text-axiom-bad { color: #e11d48; }
[data-axiom-launch-dock] .text-axiom-warn, .axiom-x-launch-mount .text-axiom-warn { color: #d97706; }
[data-axiom-launch-dock] .underline, .axiom-x-launch-mount .underline { text-decoration-line: underline; }
[data-axiom-launch-dock] .transition-colors, .axiom-x-launch-mount .transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
[data-axiom-launch-dock] .transition-opacity, .axiom-x-launch-mount .transition-opacity { transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
[data-axiom-launch-dock] .hover\\:opacity-90:hover, .axiom-x-launch-mount .hover\\:opacity-90:hover { opacity: 0.9; }
[data-axiom-launch-dock] .hover\\:bg-axiom-muted:hover, .axiom-x-launch-mount .hover\\:bg-axiom-muted:hover { background-color: #6b6b66; }
[data-axiom-launch-dock] .focus\\:outline-none:focus, .axiom-x-launch-mount .focus\\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
[data-axiom-launch-dock] .py-1\\.5, .axiom-x-launch-mount .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
[data-axiom-launch-dock] .font-medium, .axiom-x-launch-mount .font-medium { font-weight: 500; }
[data-axiom-launch-dock] .animate-pulse, .axiom-x-launch-mount .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
[data-axiom-launch-dock] .overflow-y-auto, .axiom-x-launch-mount .overflow-y-auto { overflow-y: auto; }
[data-axiom-launch-dock] .max-h-\\[300px\\], .axiom-x-launch-mount .max-h-\\[300px\\] { max-height: 300px; }
`

startWhenReady()
