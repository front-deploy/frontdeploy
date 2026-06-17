import { useEffect, useMemo, useState } from "react"

import type { AxiomTokenContext } from "../lib/axiomTokenContext"
import {
  auditDeveloperReputation,
  type ReputationResponse
} from "../lib/developerReputation"

export function DeveloperReputationPanel({
  tokenAddress,
  context
}: {
  tokenAddress: string
  context?: AxiomTokenContext | undefined
}) {
  const contextKey = useMemo(() => JSON.stringify(context ?? {}), [context])
  const [websiteUrl, setWebsiteUrl] = useState(context?.websiteUrl ?? "")
  const [githubRepoUrl, setGithubRepoUrl] = useState(context?.githubRepoUrl ?? "")
  const [xPostUrl, setXPostUrl] = useState(context?.xPostUrl ?? "")
  const [marketCap, setMarketCap] = useState(
    context?.marketCapUsd !== undefined ? String(Math.round(context.marketCapUsd)) : ""
  )
  const [narrative, setNarrative] = useState(context?.narrative ?? "")
  const [result, setResult] = useState<ReputationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setWebsiteUrl(context?.websiteUrl ?? "")
    setGithubRepoUrl(context?.githubRepoUrl ?? "")
    setXPostUrl(context?.xPostUrl ?? "")
    setMarketCap(context?.marketCapUsd !== undefined ? String(Math.round(context.marketCapUsd)) : "")
    setNarrative(context?.narrative ?? "")
    setResult(null)
    setError("")
  }, [contextKey, context])

  useEffect(() => {
    if (!context) return
    const hasEvidence =
      Boolean(context.websiteUrl) ||
      Boolean(context.githubRepoUrl) ||
      Boolean(context.xPostUrl) ||
      context.marketCapUsd !== undefined

    if (hasEvidence) {
      void runAudit({
        websiteUrl: context.websiteUrl ?? "",
        githubRepoUrl: context.githubRepoUrl ?? "",
        xPostUrl: context.xPostUrl ?? "",
        marketCap:
          context.marketCapUsd !== undefined ? String(Math.round(context.marketCapUsd)) : "",
        narrative: context.narrative ?? ""
      })
    }
  }, [contextKey])

  async function runAudit(overrides?: {
    websiteUrl: string
    githubRepoUrl: string
    xPostUrl: string
    marketCap: string
    narrative: string
  }) {
    setLoading(true)
    setError("")
    const values = overrides ?? { websiteUrl, githubRepoUrl, xPostUrl, marketCap, narrative }
    const nextWebsiteUrl = optionalValue(values.websiteUrl)
    const nextGithubRepoUrl = optionalValue(values.githubRepoUrl)
    const nextXPostUrl = optionalValue(values.xPostUrl)
    const nextNarrative = optionalValue(values.narrative)
    const nextMarketCap = parseMarketCap(values.marketCap)
    const payload = {
      tokenAddress,
      ...(nextWebsiteUrl ? { websiteUrl: nextWebsiteUrl } : {}),
      ...(nextGithubRepoUrl ? { githubRepoUrl: nextGithubRepoUrl } : {}),
      ...(nextXPostUrl ? { xPostUrl: nextXPostUrl } : {}),
      ...(nextNarrative ? { narrative: nextNarrative } : {}),
      ...(nextMarketCap !== undefined ? { marketCapUsd: nextMarketCap } : {})
    }

    const nextResult = await auditDeveloperReputation(payload)

    setLoading(false)

    if (!nextResult) {
      setError("Backend reputation audit unavailable")
      return
    }

    setResult(nextResult)
  }

  return (
    <section className="rounded-sm border border-axiom-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-axiom-muted">Developer reputation</p>
          <h2 className="mt-1 text-sm font-semibold">
            {context ? "Auto proof from Axiom card" : "Project proof audit"}
          </h2>
        </div>
        {result ? (
          <span className={scoreClass(result.level)}>{result.score}/100</span>
        ) : null}
      </div>

      {context ? (
        <div className="mt-3 rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5 text-axiom-muted">
          <p>
            Detected {context.ticker ?? "token"} from Axiom card
            {context.deployerHandle ? `, social @${context.deployerHandle}` : ""}.
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-axiom-text">
            {context.shortAddress ?? context.address}
          </p>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <AuditInput
          label="Website"
          value={websiteUrl}
          placeholder="https://project.site"
          onChange={setWebsiteUrl}
        />
        <AuditInput
          label="GitHub repo"
          value={githubRepoUrl}
          placeholder="https://github.com/owner/repo"
          onChange={setGithubRepoUrl}
        />
        <AuditInput
          label="X post"
          value={xPostUrl}
          placeholder="https://x.com/account/status/..."
          onChange={setXPostUrl}
        />
        <AuditInput
          label="Market cap"
          value={marketCap}
          placeholder="10000"
          onChange={setMarketCap}
        />
        <label className="block">
          <span className="text-xs font-bold uppercase text-axiom-muted">Narrative</span>
          <textarea
            className="mt-1 min-h-16 w-full resize-none rounded-sm border border-axiom-border bg-white px-3 py-2 text-xs text-axiom-text outline-none focus:border-axiom-accent"
            value={narrative}
            placeholder="e.g. Coinbase replied, Sam Altman narrative, dev account posted CA"
            onChange={(event) => setNarrative(event.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className="mt-3 rounded-sm bg-axiom-accent px-3 py-2 text-sm font-bold text-white transition hover:bg-axiom-muted disabled:cursor-not-allowed disabled:bg-axiom-muted"
        disabled={loading}
        onClick={() => void runAudit()}>
        {loading ? "Auditing" : "Audit proof"}
      </button>

      {error ? <p className="mt-2 text-xs text-axiom-bad">{error}</p> : null}

      {result ? (
        <div className="mt-4 border-t border-axiom-border pt-3">
          <p className="text-xs leading-5 text-axiom-muted">{result.summary}</p>
          {result.evidence.github ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <MiniMetric label="Repo age" value={`${result.evidence.github.ageDays}d`} />
              <MiniMetric label="Stars" value={String(result.evidence.github.stars)} />
              <MiniMetric label="Forks" value={String(result.evidence.github.forks)} />
            </div>
          ) : null}
          <ul className="mt-3 space-y-2">
            {result.checks.map((check) => (
              <li
                key={`${check.name}-${check.detail}`}
                className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-axiom-text">{check.name}</span>
                  <span className={statusClass(check.status)}>{check.status}</span>
                </div>
                <p className="mt-1 text-axiom-muted">{check.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function AuditInput({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-axiom-muted">{label}</span>
      <input
        className="mt-1 w-full rounded-sm border border-axiom-border bg-white px-3 py-2 text-xs text-axiom-text outline-none focus:border-axiom-accent"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-axiom-border bg-axiom-bg p-2">
      <p className="font-bold uppercase text-axiom-muted">{label}</p>
      <p className="mt-1 font-semibold text-axiom-text">{value}</p>
    </div>
  )
}

function optionalValue(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseMarketCap(value: string): number | undefined {
  const parsed = Number(value.replace(/[$,\s]/g, ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function scoreClass(level: ReputationResponse["level"]) {
  const color =
    level === "strong" ? "text-axiom-good" : level === "watch" ? "text-axiom-warn" : "text-axiom-bad"

  return `text-lg font-bold ${color}`
}

function statusClass(status: ReputationResponse["checks"][number]["status"]) {
  const color =
    status === "pass"
      ? "text-axiom-good"
      : status === "warn" || status === "manual"
        ? "text-axiom-warn"
        : "text-axiom-bad"

  return `font-bold uppercase ${color}`
}
