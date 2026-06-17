import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { getConfig } from "../config.js"
import { inferAddressKind, isSolanaAddress } from "../lib/address.js"
import { buildAiSummary } from "../services/summaryService.js"

const bodySchema = z.object({
  address: z.string().trim(),
  kind: z.enum(["auto", "wallet", "token"]).default("auto"),
  riskScore: z.number().int().min(1).max(100).optional(),
  facts: z.array(z.string().max(240)).max(8).optional()
})

export const registerSummaryRoutes = (app: FastifyInstance) => {
  app.post("/v1/ai/summary", async (request, reply) => {
    if (!getConfig().aiSummaryEnabled) {
      return reply.code(501).send({
        error: "ai_summary_disabled",
        message: "AI summary endpoint is disabled by configuration."
      })
    }

    const body = bodySchema.safeParse(request.body)

    if (!body.success || !isSolanaAddress(body.data.address)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Valid Solana-style address, kind, riskScore, and facts are required."
      })
    }

    const kind = inferAddressKind(
      body.data.address,
      body.data.kind === "auto" ? undefined : body.data.kind
    )

    return buildAiSummary({
      address: body.data.address,
      kind,
      riskScore: body.data.riskScore,
      facts: body.data.facts
    })
  })
}
