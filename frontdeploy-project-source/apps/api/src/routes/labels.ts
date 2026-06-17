import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { getConfig } from "../config.js"
import { isDatabaseConfigured } from "../db/client.js"
import { isSolanaAddress } from "../lib/address.js"
import { getWalletLabel, upsertWalletLabel } from "../repositories/intelligenceStore.js"

const paramsSchema = z.object({
  address: z.string().trim()
})

const bodySchema = z.object({
  label: z.string().trim().min(1).max(64)
})

const getOwnerId = (value: string | string[] | undefined): string | null => {
  const ownerId = Array.isArray(value) ? value[0] : value
  return ownerId && ownerId.length <= 128 ? ownerId : null
}

export const registerLabelRoutes = (app: FastifyInstance) => {
  app.get("/v1/labels/:address", async (request, reply) => {
    const config = getConfig()

    if (!config.cloudLabelSyncEnabled) {
      return reply.code(501).send({
        error: "label_sync_disabled",
        message: "Cloud label sync is disabled until auth is configured."
      })
    }

    if (!isDatabaseConfigured()) {
      return reply.code(503).send({
        error: "database_not_configured",
        message: "DATABASE_URL is required for cloud label sync."
      })
    }

    const params = paramsSchema.safeParse(request.params)
    const ownerId = getOwnerId(request.headers["x-axiom-user-id"])

    if (!params.success || !ownerId || !isSolanaAddress(params.data.address)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Valid address and x-axiom-user-id header are required."
      })
    }

    const label = await getWalletLabel(ownerId, params.data.address)
    return { label }
  })

  app.put("/v1/labels/:address", async (request, reply) => {
    const config = getConfig()

    if (!config.cloudLabelSyncEnabled) {
      return reply.code(501).send({
        error: "label_sync_disabled",
        message: "Cloud label sync is disabled until auth is configured."
      })
    }

    if (!isDatabaseConfigured()) {
      return reply.code(503).send({
        error: "database_not_configured",
        message: "DATABASE_URL is required for cloud label sync."
      })
    }

    const params = paramsSchema.safeParse(request.params)
    const body = bodySchema.safeParse(request.body)
    const ownerId = getOwnerId(request.headers["x-axiom-user-id"])

    if (!params.success || !body.success || !ownerId || !isSolanaAddress(params.data.address)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Valid address, label, and x-axiom-user-id header are required."
      })
    }

    const label = await upsertWalletLabel({
      ownerId,
      address: params.data.address,
      label: body.data.label
    })

    return { label }
  })
}
