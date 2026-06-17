import cors from "@fastify/cors"
import Fastify from "fastify"

import { getConfig } from "./config.js"
import { registerHealthRoutes } from "./routes/health.js"
import { registerIntelligenceRoutes } from "./routes/intelligence.js"
import { registerLabelRoutes } from "./routes/labels.js"
import { registerProviderRoutes } from "./routes/providers.js"
import { registerReputationRoutes } from "./routes/reputation.js"
import { registerSummaryRoutes } from "./routes/summary.js"

export const buildApp = () => {
  const config = getConfig()
  const app = Fastify({
    logger: config.nodeEnv !== "test"
  })

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }

      const isAllowed = config.allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin.endsWith("*")) {
          return origin.startsWith(allowedOrigin.slice(0, -1))
        }

        return origin === allowedOrigin
      })

      callback(null, isAllowed)
    },
    methods: ["GET", "POST", "PUT", "OPTIONS"]
  })

  registerHealthRoutes(app)
  registerProviderRoutes(app)
  registerIntelligenceRoutes(app)
  registerLabelRoutes(app)
  registerReputationRoutes(app)
  registerSummaryRoutes(app)

  return app
}
