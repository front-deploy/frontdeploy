import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
// Load .env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();
const TWITTER_API_KEY = process.env.TWITTER_PROVIDER_KEY || '';
// Adjust the base URL according to the chosen provider's documentation
const BASE_URL = 'https://api.twitterapi.io/twitter/user/following';
/**
 * Fetches the following list for a given X handle.
 * This is a generic implementation tailored for twitterapi.io or similar services.
 */
async function fetchFollowing(userName) {
    if (!TWITTER_API_KEY) {
        console.warn(`[Mock] TWITTER_PROVIDER_KEY is missing. Returning dummy following for @${userName}`);
        // Return dummy data for testing purposes
        return ['dummy_alpha', 'dummy_beta', 'kylianmbappe', 'aeyakovenko', '0xmert_'];
    }
    try {
        const url = `${BASE_URL}?userName=${userName}`;
        const response = await fetch(url, {
            headers: {
                'X-API-Key': TWITTER_API_KEY,
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            console.error(`Failed to fetch following for ${userName}: HTTP ${response.status}`);
            return [];
        }
        const data = await response.json();
        // Handle generic response shapes from 3rd party APIs
        const users = data.users || data.data || [];
        const handles = users.map((u) => u.userName || u.screen_name || '').filter(Boolean);
        return handles;
    }
    catch (err) {
        console.error(`Error fetching following for @${userName}`, err);
        return [];
    }
}
async function main() {
    console.log('=============================================');
    console.log(' Starting Smart Followers Precompute Sync... ');
    console.log('=============================================');
    // 1. Fetch smart accounts
    let smartAccounts = await prisma.smartAccount.findMany();
    // If the SmartAccount table is empty, auto-seed it from the Watchlist
    if (smartAccounts.length === 0) {
        console.log('[Info] No SmartAccounts found. Seeding from Watchlist...');
        const watchlists = await prisma.watchlist.findMany({ where: { enabled: true } });
        for (const wl of watchlists) {
            const sa = await prisma.smartAccount.create({
                data: {
                    handle: wl.handle,
                    userId: wl.userId,
                    category: wl.tier
                }
            });
            smartAccounts.push(sa);
        }
        console.log(`[Info] Seeded ${watchlists.length} accounts.`);
    }
    console.log(`[Process] Found ${smartAccounts.length} Smart Accounts to sync.`);
    // 2. Iterate and sync following
    for (const account of smartAccounts) {
        console.log(`[Process] Fetching following for @${account.handle}...`);
        const followingHandles = await fetchFollowing(account.handle);
        console.log(`[Success] Found ${followingHandles.length} following for @${account.handle}.`);
        if (followingHandles.length === 0)
            continue;
        // We do an upsert mapping approach. In production with large lists, use createMany / transactions.
        let mappedCount = 0;
        for (const targetHandle of followingHandles) {
            const handleLower = targetHandle.toLowerCase();
            try {
                await prisma.smartFollowerMapping.upsert({
                    where: {
                        targetHandle_smartAccountId: {
                            targetHandle: handleLower,
                            smartAccountId: account.id
                        }
                    },
                    create: {
                        targetHandle: handleLower,
                        smartAccountId: account.id
                    },
                    update: {
                        detectedAt: new Date()
                    }
                });
                mappedCount++;
            }
            catch (err) {
                console.error(`[Error] Failed to insert mapping for ${handleLower}`, err);
            }
        }
        console.log(`[Success] Inserted/Updated ${mappedCount} mappings for @${account.handle}.`);
        // Sleep for 2 seconds to avoid aggressive rate-limiting
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log('=============================================');
    console.log(' Smart Followers Sync Completed Successfully!');
    console.log('=============================================');
}
main()
    .catch(e => {
    console.error('Fatal error during sync:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=syncSmartFollowers.js.map