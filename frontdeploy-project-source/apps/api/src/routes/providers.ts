import type { FastifyInstance } from "fastify"

import { getConfig } from "../config.js"
import { isDatabaseConfigured } from "../db/client.js"

export const registerProviderRoutes = (app: FastifyInstance) => {
  app.get("/v1/providers/status", async () => {
    const config = getConfig()

    return {
      providers: {
        helius: {
          configured: Boolean(config.heliusApiKey),
          env: "HELIUS_API_KEY"
        },
        birdeye: {
          configured: Boolean(config.birdeyeApiKey),
          env: "BIRDEYE_API_KEY"
        },
        jupiter: {
          configured: Boolean(config.jupiterApiKey),
          env: "JUPITER_API_KEY"
        },
        gmgn: {
          configured: Boolean(config.gmgnApiKey) && config.gmgnEnabled,
          env: "GMGN_API_KEY",
          mode: "read-only token info via gmgn-cli"
        },
        solanaTracker: {
          configured: Boolean(config.solanaTrackerApiKey),
          env: "SOLANA_TRACKER_API_KEY",
          mode: "token safety and risk score"
        },
        goPlus: {
          configured: Boolean(config.goPlusApiKey),
          env: "GOPLUS_API_KEY",
          mode: "Solana token security"
        },
        dexscreener: {
          configured: true,
          env: null
        }
      },
      database: {
        configured: isDatabaseConfigured(),
        env: "DATABASE_URL"
      },
      aiSummary: {
        configured: config.aiSummaryEnabled,
        env: "AI_SUMMARY_ENABLED"
      },
      safety: "Provider keys are read from backend environment variables only. The extension must not store provider API keys."
    }
  })
}
