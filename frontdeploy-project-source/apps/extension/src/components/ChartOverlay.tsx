import { useState, useEffect } from "react"
import { TokenRiskPanel } from "./TokenRiskPanel"
import type { TokenIntelligence } from "../lib/mockIntelligence"

interface ChartOverlayProps {
  tokenAddress: string
  tier: "none" | "base" | "plus" | "founding"
}

export function ChartOverlay({ tokenAddress, tier }: ChartOverlayProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [intel, setIntel] = useState<TokenIntelligence | null>(null)

  useEffect(() => {
    // Mock fetching intel for this token
    setIntel({
      address: tokenAddress,
      type: "token",
      source: "mock",
      providerStatus: "Mock intelligence",
      badge: "Unknown",
      risk: { score: 85, level: "low", label: "Safe" } as any, // Cast as any if label is sufficient
      holderRisk: "Low",
      freshWalletActivity: "Minimal",
      whaleActivity: "Moderate",
      priceUsd: 0.0042,
      summary: "Deployer has clean history. Top 10 hold 12%.",
      recentActivity: []
    })
  }, [tokenAddress])

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] rounded-sm bg-axiom-panel border border-axiom-border px-3 py-1.5 text-xs font-semibold text-axiom-text shadow-lg hover:bg-axiom-bg transition-colors"
      >
        Axiom Pro
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-72 rounded-sm bg-axiom-panel border border-axiom-border shadow-2xl overflow-hidden flex flex-col font-sans">
      <div className="bg-axiom-bg border-b border-axiom-border px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-bold text-axiom-text uppercase tracking-wider">Axiom Pro Overlay</span>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-axiom-muted hover:text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2L10 10M10 2L2 10" />
          </svg>
        </button>
      </div>
      <div className="p-3">
        <div className="mb-3">
          <div className="text-[10px] text-axiom-muted mb-1 uppercase tracking-widest">Target Token</div>
          <div className="text-xs text-axiom-text font-mono bg-axiom-bg border border-axiom-border p-1.5 rounded-sm truncate">
            {tokenAddress}
          </div>
        </div>
        
        {tier === "none" || tier === "base" ? (
          <div className="text-center py-4">
            <div className="text-xs text-axiom-muted mb-2">Axiom Overlay requires Plus Tier</div>
            <a href="https://pump.fun" target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-axiom-accent hover:underline">
              Hold 0.5% $FDP to unlock
            </a>
          </div>
        ) : (
          intel && <TokenRiskPanel intelligence={intel} />
        )}
      </div>
    </div>
  )
}
