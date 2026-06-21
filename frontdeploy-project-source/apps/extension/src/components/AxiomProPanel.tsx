import { useEffect, useState } from "react"
import { DeveloperReputationPanel } from "./DeveloperReputationPanel"
import { TokenRiskPanel } from "./TokenRiskPanel"
import type { TokenIntelligence } from "../lib/mockIntelligence"
import type { AxiomTokenContext } from "../lib/axiomTokenContext"

type SmartMoneyEvent = {
  action: string
  amount: string
  walletLabel: string
}

export function AxiomProPanel({ mintAddress, context }: { mintAddress: string, context?: AxiomTokenContext | undefined }) {
  const [intel, setIntel] = useState<TokenIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [smartMoneyEvents, setSmartMoneyEvents] = useState<SmartMoneyEvent[]>([])
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    
    let ws: WebSocket | null = null

    async function initialize() {
      try {
        const backendUrl = (process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL || "https://frontdeploy-production.up.railway.app").replace(/\/+$/, "")
        
        // 1. Fetch static risk scan
        const res = await fetch(`${backendUrl}/v1/risk/token/${mintAddress}`)
        if (res.ok) {
          const data = await res.json()
          
          if (active) {
            setIntel({
              address: mintAddress,
              type: "token",
              source: "live",
              providerStatus: "Live backend",
              badge: data.level === "high" ? "Risky" : "Unknown",
              risk: {
                score: data.score,
                level: data.level,
                label: data.level === "high" ? "Risky" : data.level === "medium" ? "Watch" : "Clean"
              },
              holderRisk: `Top 10: ${data.details?.top10Concentration}%`,
              freshWalletActivity: data.details?.freshWalletActivity || "Unknown",
              whaleActivity: data.details?.whaleActivity || "Unknown",
              summary: data.warnings?.join(" ") || "Token appears clean. Authority revoked and routes clear.",
              recentActivity: []
            })
          }
        }
        
        // 2. Connect to WebSocket for Smart Money
        const wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/kol-alerts"
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          if (active) {
            setWsConnected(true)
            ws?.send(JSON.stringify({ action: "subscribe", mint: mintAddress }))
          }
        }
        
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "smart_money" && msg.data.mint === mintAddress) {
              setSmartMoneyEvents((prev) => [msg.data, ...prev].slice(0, 5)) // keep last 5 events
            }
          } catch (e) {
            console.error("Failed to parse WS message", e)
          }
        }
        
        ws.onclose = () => {
          if (active) setWsConnected(false)
        }
      } catch (err) {
        // Fallback
      } finally {
        if (active) setLoading(false)
      }
    }
    
    void initialize()

    return () => {
      active = false
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "unsubscribe", mint: mintAddress }))
        ws.close()
      }
    }
  }, [mintAddress])

  if (loading) {
    return <div className="text-center text-axiom-muted text-sm py-4">Scanning token data...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Deployer Intel */}
      <DeveloperReputationPanel tokenAddress={mintAddress} context={context} />
      
      {/* Rug Scan Component */}
      <div className="rounded-sm border border-axiom-border bg-axiom-panel p-4">
        <p className="text-xs font-bold uppercase text-axiom-muted mb-3">Rug Scan</p>
        {intel ? (
          <TokenRiskPanel intelligence={intel} />
        ) : (
          <p className="text-sm text-axiom-muted">Scan failed</p>
        )}
      </div>
      
      {/* Realtime Smart-Money */}
      <div className="rounded-sm border border-axiom-border bg-axiom-panel p-4">
        <p className="text-xs font-bold uppercase text-axiom-muted flex items-center justify-between mb-3">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-axiom-good animate-pulse' : 'bg-axiom-bad'}`}></span>
            Smart Money (Live)
          </span>
          <span className="text-[10px] font-normal">{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </p>
        
        {smartMoneyEvents.length === 0 ? (
          <p className="text-sm text-axiom-muted">Waiting for events...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {smartMoneyEvents.map((ev, i) => (
              <div key={i} className="flex justify-between text-xs p-2 bg-axiom-bg border border-axiom-border rounded">
                <span className="font-bold text-axiom-text">
                  <span className={ev.action.toUpperCase() === 'BUY' ? 'text-axiom-good' : 'text-axiom-bad'}>
                    {ev.action.toUpperCase()}
                  </span>
                  {" "}{ev.amount}
                </span>
                <span className="text-axiom-muted">{ev.walletLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
