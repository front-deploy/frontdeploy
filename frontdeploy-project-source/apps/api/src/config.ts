import "./env.js"

export type AppConfig = {
  host: string
  port: number
  nodeEnv: string
  allowedOrigins: string[]
  databaseUrl?: string
  databaseSsl: boolean
  cloudLabelSyncEnabled: boolean
  heliusApiKey?: string
  birdeyeApiKey?: string
  jupiterApiKey?: string
  gmgnApiKey?: string
  gmgnCliPath: string
  gmgnEnabled: boolean
  solanaTrackerApiKey?: string
  goPlusApiKey?: string
  providerTimeoutMs: number
  aiSummaryEnabled: boolean
}

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value ?? "8787")
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 8787
}

const parseAllowedOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return ["chrome-extension://*", "http://localhost:1012", "http://localhost:1815"]
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const getConfig = (): AppConfig => ({
  host: process.env.HOST ?? "127.0.0.1",
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV ?? "development",
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === "true",
  cloudLabelSyncEnabled: process.env.CLOUD_LABEL_SYNC_ENABLED === "true",
  heliusApiKey: process.env.HELIUS_API_KEY,
  birdeyeApiKey: process.env.BIRDEYE_API_KEY,
  jupiterApiKey: process.env.JUPITER_API_KEY,
  gmgnApiKey: process.env.GMGN_API_KEY,
  gmgnCliPath: process.env.GMGN_CLI_PATH ?? "gmgn-cli",
  gmgnEnabled: process.env.GMGN_ENABLED !== "false",
  solanaTrackerApiKey: process.env.SOLANA_TRACKER_API_KEY,
  goPlusApiKey: process.env.GOPLUS_API_KEY,
  providerTimeoutMs: parsePort(process.env.PROVIDER_TIMEOUT_MS ?? "7000"),
  aiSummaryEnabled: process.env.AI_SUMMARY_ENABLED !== "false"
})
