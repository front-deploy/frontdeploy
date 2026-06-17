import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { isSolanaAddress } from "../lib/address.js"
import { auditDeveloperReputation } from "../services/reputationService.js"

const bodySchema = z.object({
  tokenAddress: z.string().trim(),
  claimedCa: z.string().trim().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  githubRepoUrl: z.string().url().optional().or(z.literal("")),
  xPostUrl: z.string().url().optional().or(z.literal("")),
  narrative: z.string().max(500).optional(),
  marketCapUsd: z.number().min(0).optional()
})

export const registerReputationRoutes = (app: FastifyInstance) => {
  app.post("/v1/reputation/developer", async (request, reply) => {
    const body = bodySchema.safeParse(request.body)

    if (!body.success || !isSolanaAddress(body.data.tokenAddress)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Valid tokenAddress and optional evidence URLs are required."
      })
    }

    return auditDeveloperReputation({
      ...body.data,
      websiteUrl: normalizeOptional(body.data.websiteUrl),
      githubRepoUrl: normalizeOptional(body.data.githubRepoUrl),
      xPostUrl: normalizeOptional(body.data.xPostUrl)
    })
  })
}

const normalizeOptional = (value: string | undefined): string | undefined =>
  value && value.trim().length > 0 ? value.trim() : undefined
