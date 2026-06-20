-- CreateTable
CREATE TABLE "frontdeploy_watchlist" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frontdeploy_watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frontdeploy_kol_event" (
    "id" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "authorHandle" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isSignal" BOOLEAN NOT NULL DEFAULT false,
    "contractAddress" TEXT,
    "ticker" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frontdeploy_kol_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frontdeploy_smart_account" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "userId" TEXT,
    "category" TEXT,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frontdeploy_smart_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frontdeploy_smart_follower_mapping" (
    "id" TEXT NOT NULL,
    "targetHandle" TEXT NOT NULL,
    "smartAccountId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frontdeploy_smart_follower_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "frontdeploy_watchlist_handle_key" ON "frontdeploy_watchlist"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "frontdeploy_watchlist_userId_key" ON "frontdeploy_watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "frontdeploy_kol_event_tweetId_key" ON "frontdeploy_kol_event"("tweetId");

-- CreateIndex
CREATE UNIQUE INDEX "frontdeploy_smart_account_handle_key" ON "frontdeploy_smart_account"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "frontdeploy_smart_account_userId_key" ON "frontdeploy_smart_account"("userId");

-- CreateIndex
CREATE INDEX "frontdeploy_smart_follower_mapping_targetHandle_idx" ON "frontdeploy_smart_follower_mapping"("targetHandle");

-- CreateIndex
CREATE UNIQUE INDEX "frontdeploy_smart_follower_mapping_targetHandle_smartAccoun_key" ON "frontdeploy_smart_follower_mapping"("targetHandle", "smartAccountId");

-- AddForeignKey
ALTER TABLE "frontdeploy_smart_follower_mapping" ADD CONSTRAINT "frontdeploy_smart_follower_mapping_smartAccountId_fkey" FOREIGN KEY ("smartAccountId") REFERENCES "frontdeploy_smart_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

