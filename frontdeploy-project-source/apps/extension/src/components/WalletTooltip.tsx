import type { AxiomTokenContext } from "../lib/axiomTokenContext"
import type { ReputationResponse } from "../lib/developerReputation"
import type { AddressIntelligence } from "../lib/mockIntelligence"
import { TokenRiskPanel } from "./TokenRiskPanel"

interface WalletTooltipProps {
  intelligence: AddressIntelligence
  userLabel?: string | null
  tokenContext?: AxiomTokenContext | undefined
  reputation?: ReputationResponse | null | undefined
  reputationLoading?: boolean
}

export function WalletTooltip({
  intelligence,
  userLabel,
  tokenContext,
  reputation,
  reputationLoading = false
}: WalletTooltipProps) {
  return (
    <div className="w-80 rounded-sm border border-axiom-border bg-axiom-panel p-3 text-axiom-text shadow-none">
      <div className="mb-3 grid grid-cols-[1fr_auto] items-start gap-3 border-b border-axiom-border pb-3">
        <div>
          <p className="text-xs uppercase text-axiom-muted">
            {intelligence.type}
          </p>
          <p className="mt-1 max-w-44 truncate text-sm font-semibold">
            {userLabel ?? ("label" in intelligence ? intelligence.label : "Token")}
          </p>
        </div>
        <span className="rounded-sm border border-axiom-border px-2 py-1 text-xs font-bold text-axiom-accent">
          {intelligence.badge}
        </span>
      </div>

      {intelligence.type === "wallet" ? (
        <div className="space-y-2">
          <Metric label="PnL 7D" value={intelligence.pnl7d} />
          <Metric label="Winrate" value={intelligence.winrate} />
          <Metric label="Risk score" value={`${intelligence.risk.score}/100`} />
          <Metric label="Source" value={intelligence.source} />
          <p className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5 text-axiom-muted">
            {intelligence.summary}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokenContext ? <AxiomContextSummary context={tokenContext} /> : null}
          <TokenRiskPanel intelligence={intelligence} />
          {tokenContext ? (
            <ReputationSummary reputation={reputation} loading={reputationLoading} />
          ) : null}
        </div>
      )}
    </div>
  )
}

function AxiomContextSummary({ context }: { context: AxiomTokenContext }) {
  return (
    <div className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase text-axiom-muted">Axiom card</span>
        <span className="font-semibold text-axiom-text">
          {context.ticker ?? context.shortAddress ?? "token"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ProofMetric label="MC" value={formatMarketCap(context.marketCapUsd)} />
        <ProofMetric
          label="X"
          value={context.deployerHandle ? `@${context.deployerHandle}` : "n/a"}
        />
      </div>
    </div>
  )
}

function ReputationSummary({
  reputation,
  loading
}: {
  reputation?: ReputationResponse | null | undefined
  loading: boolean
}) {
  if (loading) {
    return (
      <p className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs font-semibold text-axiom-muted">
        Checking website, X, and GitHub proof...
      </p>
    )
  }

  if (!reputation) {
    return (
      <p className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs text-axiom-muted">
        Proof audit needs website, X post, GitHub, or market cap evidence from the card.
      </p>
    )
  }

  return (
    <div className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase text-axiom-muted">Proof audit</span>
        <span className={levelClass(reputation.level)}>{reputation.score}/100</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <ProofMetric label="Website CA" value={reputation.evidence.websiteCaFound ? "yes" : "no"} />
        <ProofMetric label="GitHub CA" value={reputation.evidence.githubCaFound ? "yes" : "no"} />
        <ProofMetric label="X CA" value={reputation.evidence.xCaFound ? "yes" : "manual"} />
      </div>
    </div>
  )
}

function ProofMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold uppercase text-axiom-muted">{label}</p>
      <p className="mt-1 truncate font-semibold text-axiom-text">{value}</p>
    </div>
  )
}

function formatMarketCap(value?: number) {
  if (value === undefined) return "n/a"
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(0)}`
}

function levelClass(level: ReputationResponse["level"]) {
  const color =
    level === "strong" ? "text-axiom-good" : level === "watch" ? "text-axiom-warn" : "text-axiom-bad"

  return `font-bold ${color}`
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-axiom-muted">{label}</span>
      <span className="font-semibold text-axiom-text">{value}</span>
    </div>
  )
}
