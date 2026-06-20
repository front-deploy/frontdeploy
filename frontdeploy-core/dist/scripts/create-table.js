import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "frontdeploy_deployer_history" (
      "id" TEXT NOT NULL,
      "walletAddress" TEXT NOT NULL,
      "totalLaunches" INTEGER NOT NULL DEFAULT 0,
      "ruggedLaunches" INTEGER NOT NULL DEFAULT 0,
      "walletAgeDays" INTEGER NOT NULL DEFAULT 0,
      "riskScore" INTEGER NOT NULL DEFAULT 50,
      "riskLevel" TEXT NOT NULL DEFAULT 'watch',
      "fundingSource" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "frontdeploy_deployer_history_pkey" PRIMARY KEY ("id")
    );
  `);
    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "frontdeploy_deployer_history_walletAddress_key" ON "frontdeploy_deployer_history"("walletAddress");
  `);
    console.log("Created frontdeploy_deployer_history table");
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=create-table.js.map