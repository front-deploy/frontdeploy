import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    await prisma.smartFollowerMapping.deleteMany({});
    const allAccounts = await prisma.smartAccount.findMany();
    const targets = [
        { handle: 'elonmusk', count: 18 },
        { handle: 'vitalikbuterin', count: 24 },
        { handle: '0xmert_', count: 32 },
        { handle: 'aeyakovenko', count: 27 },
        { handle: 'ansem', count: 15 }
    ];
    for (const t of targets) {
        // shuffle and pick count
        const shuffled = allAccounts.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, t.count);
        for (const sa of selected) {
            await prisma.smartFollowerMapping.upsert({
                where: { targetHandle_smartAccountId: { targetHandle: t.handle, smartAccountId: sa.id } },
                create: { targetHandle: t.handle, smartAccountId: sa.id },
                update: {}
            });
        }
    }
    console.log('Realistic dummy smart followers inserted!');
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=insert-smart.js.map