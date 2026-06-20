import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import { WebSocketService } from './services/websocketService.js';
import { IngestionPipeline } from './services/ingestionPipeline.js';
import { TwitterApiIoSource } from './services/twitterApiIoSource.js';
import { MockSimulatorService } from './services/mockSimulator.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const app = fastify({ logger: true });
// Register plugins
app.register(cors, { origin: '*' });
app.register(websocketPlugin);
// Initialize Services
let wsService;
app.register(async (instance) => {
    wsService = new WebSocketService(instance);
    wsService.registerRoutes();
    // Start services
    if (process.env.USE_MOCK_STREAM === 'true' || !process.env.TWITTER_PROVIDER_KEY) {
        const mockSimulator = new MockSimulatorService(wsService, app.log);
        mockSimulator.start(15000); // Send mock tweet every 15 seconds
    }
    else {
        const source = new TwitterApiIoSource(app.log);
        // Poll every 10 seconds by default, configurable via env
        const pollIntervalMs = process.env.POLL_INTERVAL_SEC ? parseInt(process.env.POLL_INTERVAL_SEC) * 1000 : 10000;
        const pipeline = new IngestionPipeline(source, wsService, app.log, pollIntervalMs);
        await pipeline.start();
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
    }
    catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch watchlist' });
    }
});
app.get('/smart-followers', async (request, reply) => {
    try {
        const { handle } = request.query;
        if (!handle) {
            return reply.status(400).send({ error: 'Handle is required' });
        }
        // Match case insensitively if possible, but let's just do exact for now or toLowerCase
        // We assume targetHandle is saved in lowercase or exact case.
        const followers = await prisma.smartFollowerMapping.findMany({
            where: {
                targetHandle: {
                    equals: handle,
                    mode: 'insensitive' // Requires postgres
                }
            },
            include: {
                smartAccount: true
            }
        });
        return followers.map((f) => f.smartAccount);
    }
    catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch smart followers' });
    }
});
const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
        await app.listen({ port, host: '0.0.0.0' });
        app.log.info(`Server listening on port ${port}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=app.js.map