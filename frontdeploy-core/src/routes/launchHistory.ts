import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../app.js';

export const launchHistoryRoutes: FastifyPluginAsync = async (app) => {
  // GET /launch-history
  app.get('/', async (request, reply) => {
    try {
      const history = await prisma.launchHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit to latest 100
      });
      return reply.send(history);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /launch-history
  // Expected body: { mintAddress, ticker, name, deployerAddress, txHash }
  app.post<{
    Body: {
      mintAddress: string;
      ticker: string;
      name: string;
      deployerAddress: string;
      txHash: string;
    }
  }>('/', async (request, reply) => {
    const { mintAddress, ticker, name, deployerAddress, txHash } = request.body;

    if (!mintAddress || !ticker || !name || !deployerAddress || !txHash) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
      const record = await prisma.launchHistory.create({
        data: {
          mintAddress,
          ticker,
          name,
          deployerAddress,
          txHash
        }
      });
      return reply.status(201).send(record);
    } catch (error) {
      app.log.error(error);
      // Prisma unique constraint violation code
      if ((error as any).code === 'P2002') {
        return reply.status(409).send({ error: 'Launch already recorded' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};
