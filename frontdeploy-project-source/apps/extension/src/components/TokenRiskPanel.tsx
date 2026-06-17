import type { TokenIntelligence } from "../lib/mockIntelligence"

interface TokenRiskPanelProps {
  intelligence: TokenIntelligence
}

export function TokenRiskPanel({ intelligence }: TokenRiskPanelProps) {
  return (
    <div className="space-y-2">
      <Metric label="Risk score" value={`${intelligence.risk.score}/100`} />
      <Metric label="Holder risk" value={intelligence.holderRisk} />
      <Metric label="Fresh wallets" value={intelligence.freshWalletActivity} />
      <Metric label="Whales" value={intelligence.whaleActivity} />
      <Metric label="Source" value={intelligence.source} />
      {intelligence.priceUsd !== undefined ? (
        <Metric label="Price" value={formatUsd(intelligence.priceUsd)} />
      ) : null}
      <p className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5 text-axiom-muted">
        {intelligence.summary}
      </p>
    </div>
  )
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 2
  }).format(value)
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-axiom-muted">{label}</span>
      <span className="font-semibold text-axiom-text">{value}</span>
    </div>
  )
}
