import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const accounts = [
    // Tier A
    { handle: 'blknoiz06', tier: 'A' },
    { handle: 'MustStopMurad', tier: 'A' },
    { handle: 'frankdegods', tier: 'A' },
    { handle: 'cobie', tier: 'A' },
    { handle: 'HsakaTrades', tier: 'A' },
    { handle: 'CryptoKaleo', tier: 'A' },
    { handle: 'GiganticRebirth', tier: 'A' },
    { handle: 'inversebrah', tier: 'A' },
    { handle: 'notthreadguy', tier: 'A' },
    { handle: 'Tyler_Did_It', tier: 'A' },
    { handle: 'DegenSpartan', tier: 'A' },
    { handle: 'zachxbt', tier: 'A' },
    // Tier B
    { handle: 'Cupseyy', tier: 'B' },
    { handle: 'Cented7', tier: 'B' },
    { handle: 'TraderPow', tier: 'B' },
    { handle: 'Euris_x', tier: 'B' },
    { handle: 'waddles_eth', tier: 'B' },
    { handle: 'OrangeSBS', tier: 'B' },
    { handle: 'Gh0stee', tier: 'B' },
    { handle: 'Publixplays', tier: 'B' },
    { handle: 'Casino616', tier: 'B' },
    { handle: 'cookerflips', tier: 'B' },
    { handle: 'insentos', tier: 'B' },
    { handle: 'leensx100', tier: 'B' },
    { handle: 'jijo_exe', tier: 'B' },
    { handle: 'kreo', tier: 'B' },
    { handle: 'assangacalls', tier: 'B' },
    // Tier C
    { handle: 'aeyakovenko', tier: 'C' },
    { handle: 'rajgokal', tier: 'C' },
    { handle: '0xMert_', tier: 'C' },
    // Tier D
    { handle: 'sama', tier: 'D' },
    { handle: 'OpenAI', tier: 'D' },
    { handle: 'AnthropicAI', tier: 'D' },
    { handle: 'claudeai', tier: 'D' },
];
async function main() {
    console.log('Start seeding Watchlist...');
    for (const account of accounts) {
        const handle = account.handle.replace('@', '');
        // Karena kita belum menarik API Twitter untuk mencari User ID numerik aslinya,
        // kita beri nilai placeholder sementara (harus unik karena schema Prisma mensyaratkannya).
        const dummyUserId = `pending_${handle}`;
        await prisma.watchlist.upsert({
            where: { handle },
            update: {}, // Jika sudah ada, jangan lakukan apa-apa
            create: {
                handle: handle,
                tier: account.tier,
                userId: dummyUserId,
                enabled: true,
            },
        });
        console.log(`Upserted @${handle} (Tier ${account.tier})`);
    }
    console.log('Seeding finished.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map