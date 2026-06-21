import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SMART_WALLETS = [
  // Examples of some popular top-tier wallets/whales on Solana
  { handle: 'SmartWhale_1', category: 'whale' },
  { handle: 'SmartTrader_A', category: 'tier-A' },
  { handle: 'DeFi_Chad', category: 'tier-A' },
  { handle: 'Meme_Sniper', category: 'sniper' },
  { handle: 'Sol_Maxi', category: 'whale' },
];

async function main() {
  console.log("Seeding Smart Wallets to database...");
  for (let i = 0; i < 50; i++) {
    const handle = `SmartWallet_${Math.random().toString(36).substring(7)}`;
    SMART_WALLETS.push({ handle, category: 'seed' });
  }

  for (const wallet of SMART_WALLETS) {
    await prisma.smartAccount.upsert({
      where: { handle: wallet.handle },
      update: {},
      create: {
        handle: wallet.handle,
        category: wallet.category,
        followerCount: Math.floor(Math.random() * 50000)
      }
    });
  }
  
  const count = await prisma.smartAccount.count();
  console.log(`Successfully seeded! Total Smart Accounts in DB: ${count}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
