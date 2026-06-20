import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dummyEvent = {
    tweetId: `real-${Date.now()}`,
    authorHandle: 'MustStopMurad',
    authorUserId: '12345678',
    text: `Found an absolute gem. This looks like the next big thing. $FDPT CA: FDPpumpfun2zCwDJesf1CyHiexyT8nkd72gD1JuKDPG`,
    url: `https://x.com/MustStopMurad/status/${Date.now()}`,
    isSignal: true,
    contractAddress: `FDPpumpfun2zCwDJesf1CyHiexyT8nkd72gD1JuKDPG`,
    ticker: `$BBT`,
    postedAt: new Date(),
  };

  await prisma.kolEvent.create({
    data: dummyEvent
  });

  console.log('Successfully inserted realistic KOL Event into Supabase database (frontdeploy_kol_event table):');
  console.log(dummyEvent);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
