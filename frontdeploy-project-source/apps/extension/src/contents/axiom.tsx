import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"
import { saveSelectedAddress } from "../lib/storage"
import { getWalletStatus } from "../lib/popup-api"
import { checkTokenGate } from "../lib/tokenGate"
import { getSettings } from "../lib/storage"
import { ChartOverlay } from "../components/ChartOverlay"
import cssText from "data-text:../style.css"

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const config: PlasmoCSConfig = {
  matches: ["https://axiom.trade/*"],
  run_at: "document_idle"
}

// Monitors the URL for token addresses and syncs them to the extension's side panel
export default function AxiomCSUI() {
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [tier, setTier] = useState<"none" | "base" | "plus" | "founding">("none")
  const [showFlowRadar, setShowFlowRadar] = useState(true)

  useEffect(() => {
    getSettings().then(settings => {
      setShowFlowRadar(settings.showFlowRadar !== false)
    })
    
    // Listen to changes in local storage from the popup
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "local" && changes["axiomIntelligence.settings"]) {
        const newSettings = changes["axiomIntelligence.settings"].newValue
        if (newSettings && typeof newSettings.showFlowRadar === "boolean") {
          setShowFlowRadar(newSettings.showFlowRadar)
        }
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  useEffect(() => {
    let lastUrl = window.location.href
    let lastContextKey = ""
    console.log("[Frontdeploy] CSUI mounted, initial URL:", lastUrl)

    const checkUrl = async (force = false) => {
      const currentUrl = window.location.href
      
      // Extract CA from Axiom Trade URL patterns:
      // https://axiom.trade/meme/CA
      // https://axiom.trade/token/CA
      // https://axiom.trade/p/CA
      // https://axiom.trade/?token=CA
      const match = currentUrl.match(/\/(?:token|meme|p)\/([1-9A-HJ-NP-Za-km-z]{32,44})/) 
                 || currentUrl.match(/token=([1-9A-HJ-NP-Za-km-z]{32,44})/)
                 || currentUrl.match(/\/([1-9A-HJ-NP-Za-km-z]{32,44})(?:\?|$)/)
                 
      const tokenAddressFromUrl = match ? (match[1] || null) : null

      // Also try to extract the pump.fun CA from links visible on the page.
      // Axiom Trade shows the original pump.fun link in the token detail page.
      // pump.fun/{CA} or pump.fun/coin/{CA}
      const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).map(a => a.href)
      const pumpFunLink = allLinks.find(href => {
        try {
          const url = new URL(href)
          return url.hostname === "pump.fun"
        } catch { return false }
      })
      
      // Extract CA from pump.fun link: pump.fun/{CA} or pump.fun/coin/{CA}
      let tokenAddressFromPumpFun: string | null = null
      if (pumpFunLink) {
        const pumpMatch = pumpFunLink.match(/pump\.fun\/(?:coin\/)?([1-9A-HJ-NP-Za-km-z]{32,44})/)
        if (pumpMatch?.[1]) tokenAddressFromPumpFun = pumpMatch[1]
      }

      // Fallback: scan page text for addresses ending in "pump" (pump.fun token pattern)
      // Axiom Trade often displays the pump.fun CA as text on the page
      let tokenAddressFromPageText: string | null = null
      if (!tokenAddressFromPumpFun) {
        const pageText = document.body.innerText || ""
        // pump.fun token addresses often end in "pump" (44 chars, base58)
        const pumpAddrMatch = pageText.match(/\b([1-9A-HJ-NP-Za-km-z]{40,44}pump)\b/)
        if (pumpAddrMatch?.[1]) {
          tokenAddressFromPageText = pumpAddrMatch[1]
        } else {
          // Also scan all link hrefs for any pump.fun token address pattern
          for (const href of allLinks) {
            const m = href.match(/pump\.fun\/(?:coin\/)?([1-9A-HJ-NP-Za-km-z]{32,44})/)
            if (m?.[1]) { tokenAddressFromPageText = m[1]; break }
          }
        }
      }

      // Priority: pump.fun page link > page text > Axiom URL (Axiom URL may be internal ID, not CA)
      const tokenAddress = tokenAddressFromPumpFun || tokenAddressFromPageText || tokenAddressFromUrl
      
      if (!force && currentUrl === lastUrl && !tokenAddress) return

      if (tokenAddress) {
        if (tokenAddress !== activeToken) {
          setActiveToken(tokenAddress)
          // Fetch tier when a new token is found
          getWalletStatus().then(session => {
            checkTokenGate(session?.publicKey).then(gate => {
              setTier(gate.tier)
            }).catch(console.warn)
          }).catch(console.warn)
        }

        // Attempt to scrape social links and market cap from the page to populate the form
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).map(a => a.href)
        const githubRepoUrl = links.find((href) => href.includes("github.com"))
        const xPostUrl = links.find((href) => href.includes("x.com") || href.includes("twitter.com"))
        
        const ignoredDomains = ["axiom.trade", "x.com", "twitter.com", "t.me", "telegram.me", "telegram.org", "github.com", "solscan.io", "birdeye.so", "dexscreener.com", "pump.fun", "solana.com"]
        const websiteUrl = links.find((href) => {
            if (!href.startsWith("http")) return false;
            try {
                const hostname = new URL(href).hostname.replace(/^www\./, "")
                return !ignoredDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))
            } catch {
                return false
            }
        })

        const bodyText = document.body.innerText || ""
        const marketCapMatch = bodyText.match(/\b(?:MC|Market\s*Cap|Mcap|MKT\s*CAP|MCAP)[:\s]*\$?\s*([0-9,]+(?:\.[0-9]+)?)\s*([KMB])?/i)
        let marketCapUsd: number | undefined = undefined;
        if (marketCapMatch && marketCapMatch[1]) {
            const rawValue = marketCapMatch[1].replace(/,/g, "")
            const value = Number(rawValue)
            const multiplier = marketCapMatch[2]?.toUpperCase() === "B" ? 1_000_000_000 : marketCapMatch[2]?.toUpperCase() === "M" ? 1_000_000 : marketCapMatch[2]?.toUpperCase() === "K" ? 1_000 : 1
            marketCapUsd = Number.isFinite(value) ? value * multiplier : undefined
        }

        const context = {
            address: tokenAddress,
            source: "axiom-link" as const,
            // Include pump.fun URL if detected from page
            ...(pumpFunLink ? { pumpFunUrl: pumpFunLink } : {}),
            ...(websiteUrl ? { websiteUrl } : {}),
            ...(githubRepoUrl ? { githubRepoUrl } : {}),
            ...(xPostUrl ? { xPostUrl } : {}),
            ...(marketCapUsd !== undefined ? { marketCapUsd } : {})
        }
        
        const contextKey = JSON.stringify(context)
        
        // Only update if URL changed or Context scraped data changed (e.g. page finished loading)
        if (currentUrl !== lastUrl || contextKey !== lastContextKey) {
            console.log(`[Frontdeploy] Saving new address/context to storage: ${tokenAddress} (source: ${tokenAddressFromPumpFun ? 'pump.fun link' : tokenAddressFromPageText ? 'page text' : 'axiom URL'})`)
            lastUrl = currentUrl
            lastContextKey = contextKey
            
            await saveSelectedAddress({
              address: tokenAddress,
              type: "token",
              context
            })
        }
      } else {
        setActiveToken(null)
        lastUrl = currentUrl
      }
    }
    
    void checkUrl(true) // check immediately on mount
    const interval = setInterval(() => checkUrl(false), 1500)
    
    return () => clearInterval(interval)
  }, [activeToken])

  return (
    <>
      <div style={{ display: 'none' }} data-axiom-csui="active" data-active-token={activeToken || ""} />
      {showFlowRadar && activeToken && <ChartOverlay tokenAddress={activeToken} tier={tier} />}
    </>
  )
}

