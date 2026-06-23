import type { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Optional: Helius RPC CA Check
async function checkCaStatus(mint: string): Promise<string> {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  if (!rpcUrl) return 'unknown';

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAsset',
        params: { id: mint }
      }),
    });

    const data = await response.json() as any;
    if (data && data.result) {
      // Basic heuristic: check if token exists and has supply
      if (data.result.token_info) {
        if (data.result.token_info.supply === 0) return 'rugged'; // or dead
        return 'alive'; // For MVP, if it exists and has supply, consider alive
      }
    }
    return 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

export default async function accountHistoryRoutes(app: FastifyInstance) {
  app.get('/x-account-history/:handle', async (request: FastifyRequest, reply) => {
    const { handle } = request.params as { handle: string };

    try {
      // 1. Force a realtime snapshot from Twitter API to ensure we have the very latest data
      const apiKey = process.env.TWITTER_PROVIDER_KEY;
      let targetUserId: string | undefined;

      if (apiKey) {
        const twitterUrl = `https://api.twitterapi.io/twitter/user/info?userName=${handle}`;
        const tRes = await fetch(twitterUrl, {
          headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' }
        });

        if (tRes.ok) {
          const tData = await tRes.json() as any;
          const userObj = tData.user || tData;
          
          if (userObj && (userObj.id_str || userObj.id)) {
            targetUserId = userObj.id_str || userObj.id;
            
            // Take snapshot
            const UserSnapshotService = (await import('../services/userSnapshotService.js')).UserSnapshotService;
            const snapshotService = new UserSnapshotService(app.log);
            await snapshotService.takeSnapshot({
              handle: userObj.screen_name || handle,
              xUserId: targetUserId!,
              displayName: userObj.name || '',
              bio: userObj.description || '',
              avatarUrl: userObj.profile_image_url_https || ''
            });
          }
        }
      }

      // If we couldn't get the userId from API, try finding it in our local DB
      if (!targetUserId) {
        const existingSnapshot = await prisma.xIdentitySnapshot.findFirst({
          where: { handle: { equals: handle, mode: 'insensitive' } },
          orderBy: { ts: 'desc' }
        });
        if (existingSnapshot) {
          targetUserId = existingSnapshot.xUserId;
        } else {
          return reply.status(404).send({ error: 'User not found and no tracked history exists.' });
        }
      }

      // 2. Fetch Identity History
      const identityHistory = await prisma.xIdentitySnapshot.findMany({
        where: { xUserId: targetUserId },
        orderBy: { ts: 'desc' }
      });

      // 3. Fetch CA History
      // Find all KolEvents by this user that have a CA
      const kolEvents = await prisma.kolEvent.findMany({
        where: { 
          authorUserId: targetUserId as string,
          contractAddress: { not: null }
        },
        orderBy: { postedAt: 'desc' }
      });

      // Deduplicate by CA
      const uniqueCAs = new Map<string, any>();
      for (const event of kolEvents) {
        if (!event.contractAddress) continue;
        if (!uniqueCAs.has(event.contractAddress)) {
          uniqueCAs.set(event.contractAddress, {
            mint: event.contractAddress,
            ticker: event.ticker,
            firstPostedAt: event.postedAt,
            tweetUrl: event.url,
            status: 'verifying...'
          });
        }
      }

      const caHistory = Array.from(uniqueCAs.values());

      // Resolve status for MVP (Limit to first 10 for speed)
      for (let i = 0; i < Math.min(caHistory.length, 10); i++) {
        caHistory[i].status = await checkCaStatus(caHistory[i].mint);
      }

      // Compute statistics
      const changeCount = Math.max(0, identityHistory.length - 1);
      const isSerialSwapper = changeCount >= 3;

      reply.send({
        identityHistory,
        caHistory,
        changeCount,
        isSerialSwapper,
        trackedSince: identityHistory.length > 0 ? identityHistory[identityHistory.length - 1]!.ts : new Date()
      });

    } catch (err) {
      app.log.error({ err }, 'Error fetching account history');
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
