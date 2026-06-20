import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.kolEvent.deleteMany({}); // Clear old ones

  const dummyEvents = [
    {
      tweetId: `real-11111`,
      authorHandle: 'MustStopMurad',
      authorUserId: '12345678',
      text: `Found an absolute gem. This looks like the next big thing. $FDPT CA: FDPpumpfun2zCwDJesf1CyHiexyT8nkd72gD1JuKDPG`,
      url: `https://x.com/MustStopMurad/status/11111`,
      isSignal: true,
      contractAddress: `FDPpumpfun2zCwDJesf1CyHiexyT8nkd72gD1JuKDPG`,
      ticker: `$FDPT`,
      postedAt: new Date(Date.now() - 25000),
    },
    {
      tweetId: `real-22222`,
      authorHandle: 'Ansem',
      authorUserId: '87654321',
      text: `Everyone is sleeping on $TRENCH. I'm loading up right now. CA: TRCHpumpfun1aBxJklf1CyHiexyT8nkd72gD1JuKDPG`,
      url: `https://x.com/Ansem/status/22222`,
      isSignal: true,
      contractAddress: `TRCHpumpfun1aBxJklf1CyHiexyT8nkd72gD1JuKDPG`,
      ticker: `$TRENCH`,
      postedAt: new Date(Date.now() - 20000),
    },
    {
      tweetId: `real-33333`,
      authorHandle: 'blknoiz06',
      authorUserId: '11223344',
      text: `Just deployed some fresh sol into $DEPLOY. Let's see where this goes. CA: DPLYpumpfun9zQwVresf1CyHiexyT8nkd72gD1JuKDPG`,
      url: `https://x.com/blknoiz06/status/33333`,
      isSignal: true,
      contractAddress: `DPLYpumpfun9zQwVresf1CyHiexyT8nkd72gD1JuKDPG`,
      ticker: `$DEPLOY`,
      postedAt: new Date(Date.now() - 15000),
    },
    {
      tweetId: `real-44444`,
      authorHandle: 'cryptomanran',
      authorUserId: '99887766',
      text: `The team behind $RADAR is building something insane. Keeping my eyes on this one CA: RADRpumpfun4yLwKJesf1CyHiexyT8nkd72gD1JuKDPG`,
      url: `https://x.com/cryptomanran/status/44444`,
      isSignal: true,
      contractAddress: `RADRpumpfun4yLwKJesf1CyHiexyT8nkd72gD1JuKDPG`,
      ticker: `$RADAR`,
      postedAt: new Date(Date.now() - 10000),
    },
    {
      tweetId: `real-55555`,
      authorHandle: 'HsakaTrades',
      authorUserId: '55443322',
      text: `Send $NUKES. Absolute conviction play. CA: NUKEpumpfun7xMwNJesf1CyHiexyT8nkd72gD1JuKDPG`,
      url: `https://x.com/HsakaTrades/status/55555`,
      isSignal: true,
      contractAddress: `NUKEpumpfun7xMwNJesf1CyHiexyT8nkd72gD1JuKDPG`,
      ticker: `$NUKES`,
      postedAt: new Date(Date.now() - 5000),
    }
  ];

  for (const ev of dummyEvents) {
    await prisma.kolEvent.create({ data: ev });
  }

  console.log('Successfully inserted 5 realistic KOL Events into Supabase database.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
