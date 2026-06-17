import type { FastifyInstance } from "fastify"

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/health", async () => ({
    ok: true,
    service: "axiom-intelligence-api",
    version: "0.1.0"
  }))

  app.get("/", async () => ({
    name: "Frontdeploy API",
    status: "read-only",
    docs: "/health"
  }))
}
