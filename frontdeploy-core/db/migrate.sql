CREATE TABLE IF NOT EXISTS "frontdeploy_burn_history" (
    "id" TEXT NOT NULL,
    "solSpent" DOUBLE PRECISION NOT NULL,
    "fdpBought" DOUBLE PRECISION,
    "fdpBurned" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frontdeploy_burn_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "frontdeploy_burn_history_txHash_key" ON "frontdeploy_burn_history"("txHash");
