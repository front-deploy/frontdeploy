import { getConfig } from "./config.js"
import { buildApp } from "./app.js"

const config = getConfig()
const app = buildApp()

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
