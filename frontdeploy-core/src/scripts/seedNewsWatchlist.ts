import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEWS_ACCOUNTS = [
  'AnthropicAI', 'claudeai', 'OpenAI', 'sama', 'elonmusk',
  'aeyakovenko', 'rajgokal', 'a1lon9', 'pumpdotfun',
  'WatcherGuru', 'MarioNawfal', 'zerohedge'
];

async function main() {
  console.log("Seeding News Accounts into Watchlist...");
  
  for (const handle of NEWS_ACCOUNTS) {
    await prisma.watchlist.upsert({
      where: { handle },
      update: { category: 'news' },
      create: {
        handle,
        userId: 'temp_' + handle, // Temporary fallback userId if needed
        tier: 'news',
        category: 'news',
        enabled: true
      }
    });
  }
  console.log("Seeding completed.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
