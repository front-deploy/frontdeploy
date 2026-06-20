import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import { WebSocketService } from './services/websocketService.js';
import { TwitterStreamService } from './services/twitterStreamService.js';
import { MockSimulatorService } from './services/mockSimulator.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const app = fastify({ logger: true });

// Register plugins
app.register(cors, { origin: '*' });
app.register(websocketPlugin);

// Initialize Services
let wsService: WebSocketService;

app.register(async (instance) => {
  wsService = new WebSocketService(instance);
  wsService.registerRoutes();

  // Start services
  if (process.env.USE_MOCK_STREAM === 'true' || !process.env.TWITTER_BEARER_TOKEN) {
    const mockSimulator = new MockSimulatorService(wsService, app.log);
    mockSimulator.start(15000); // Send mock tweet every 15 seconds
  } else {
    const twitterService = new TwitterStreamService(wsService, app.log);
    await twitterService.connect();
  }
});

app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'frontdeploy-core' };
});

app.get('/watchlist', async (request, reply) => {
  try {
    const list = await prisma.watchlist.findMany({
      where: { enabled: true }
    });
    return list;
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch watchlist' });
  }
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
