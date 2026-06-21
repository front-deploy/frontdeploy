import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"
import { saveSelectedAddress } from "../lib/storage"
import { getWalletStatus } from "../lib/popup-api"
import { checkTokenGate } from "../lib/tokenGate"
import { ChartOverlay } from "../components/ChartOverlay"

export const config: PlasmoCSConfig = {
  matches: ["https://axiom.trade/*"],
  run_at: "document_idle"
}

// Monitors the URL for token addresses and syncs them to the extension's side panel
export default function AxiomCSUI() {
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [tier, setTier] = useState<"none" | "base" | "plus" | "founding">("none")

  useEffect(() => {
    let lastUrl = window.location.href
    let lastContextKey = ""
    console.log("[Frontdeploy] CSUI mounted, initial URL:", lastUrl)

    const checkUrl = async (force = false) => {
      const currentUrl = window.location.href
      
      // Try matching /token/ADDRESS, /meme/ADDRESS, ?token=ADDRESS, or just /ADDRESS
      const match = currentUrl.match(/\/(?:token|meme)\/([1-9A-HJ-NP-Za-km-z]{32,44})/) 
                 || currentUrl.match(/token=([1-9A-HJ-NP-Za-km-z]{32,44})/)
                 || currentUrl.match(/\/([1-9A-HJ-NP-Za-km-z]{32,44})(?:\?|$)/)
                 
      const tokenAddress = match ? (match[1] || null) : null
      
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
            ...(websiteUrl ? { websiteUrl } : {}),
            ...(githubRepoUrl ? { githubRepoUrl } : {}),
            ...(xPostUrl ? { xPostUrl } : {}),
            ...(marketCapUsd !== undefined ? { marketCapUsd } : {})
        }
        
        const contextKey = JSON.stringify(context)
        
        // Only update if URL changed or Context scraped data changed (e.g. page finished loading)
        if (currentUrl !== lastUrl || contextKey !== lastContextKey) {
            console.log(`[Frontdeploy] Saving new address/context to storage: ${tokenAddress}`)
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

  if (!activeToken) {
    return <div style={{ display: 'none' }} data-axiom-csui="active" />
  }

  return (
    <>
      <div style={{ display: 'none' }} data-axiom-csui="active" />
      <ChartOverlay tokenAddress={activeToken} tier={tier} />
    </>
  )
}

