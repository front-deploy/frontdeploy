import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { isSolanaAddress } from "../lib/address.js"
import { getAddressIntelligence } from "../services/intelligenceService.js"

const paramsSchema = z.object({
  address: z.string().trim()
})

const querySchema = z.object({
  kind: z.enum(["auto", "wallet", "token"]).default("auto")
})

export const registerIntelligenceRoutes = (app: FastifyInstance) => {
  app.get("/v1/intelligence/:address", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params)
    const query = querySchema.safeParse(request.query)

    if (!params.success || !query.success) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Address and kind query are invalid."
      })
    }

    const { address } = params.data

    if (!isSolanaAddress(address)) {
      return reply.code(422).send({
        error: "invalid_solana_address",
        message: "Expected a Base58 Solana-style address between 32 and 44 characters."
      })
    }

    const requestedKind = query.data.kind === "auto" ? undefined : query.data.kind

    return getAddressIntelligence(address, requestedKind)
  })
}
