import { isDatabaseConfigured, query } from "../db/client.js"
import type { IntelligenceResponse } from "../lib/mockIntelligence.js"

export type WalletLabel = {
  ownerId: string
  address: string
  label: string
}

export const getWalletLabel = async (
  ownerId: string,
  address: string
): Promise<WalletLabel | null> => {
  const rows = await query<WalletLabel>(
    `select owner_id as "ownerId", address, label
     from wallet_labels
     where owner_id = $1 and address = $2
     limit 1`,
    [ownerId, address]
  )

  return rows[0] ?? null
}

export const upsertWalletLabel = async (label: WalletLabel): Promise<WalletLabel | null> => {
  const rows = await query<WalletLabel>(
    `insert into wallet_labels (owner_id, address, label)
     values ($1, $2, $3)
     on conflict (owner_id, address)
     do update set label = excluded.label, updated_at = now()
     returning owner_id as "ownerId", address, label`,
    [label.ownerId, label.address, label.label]
  )

  return rows[0] ?? null
}

export const upsertIntelligenceSnapshot = async (
  intelligence: IntelligenceResponse
): Promise<void> => {
  if (!isDatabaseConfigured()) {
    return
  }

  const table = intelligence.kind === "wallet" ? "wallet_profiles" : "token_risk_cache"

  await query(
    `insert into ${table} (address, risk_score, label, summary, metrics, recent_activity, updated_at)
     values ($1, $2, $3, $4, $5::jsonb, $6, now())
     on conflict (address)
     do update set
       risk_score = excluded.risk_score,
       label = excluded.label,
       summary = excluded.summary,
       metrics = excluded.metrics,
       recent_activity = excluded.recent_activity,
       updated_at = now()`,
    [
      intelligence.address,
      intelligence.riskScore,
      intelligence.label,
      intelligence.summary,
      JSON.stringify(intelligence.metrics),
      intelligence.recentActivity
    ]
  )
}
