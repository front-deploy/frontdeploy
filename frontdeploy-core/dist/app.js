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
app.get('/burn-history', async (request, reply) => {
    try {
        const history = await prisma.burnHistory.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return history;
    }
    catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch burn history' });
    }
});
app.post('/v1/reputation/developer', async (request, reply) => {
    try {
        const body = request.body;
        if (!body || !body.tokenAddress) {
            return reply.status(400).send({ error: 'tokenAddress is required' });
        }
        const walletAddress = body.tokenAddress; // Simplification: assuming we look up by token address or creator address.
        // In reality we'd use Helius to find creator of tokenAddress, then look up creator in DB.
        // Let's return a simulated response matching ReputationResponse type for now.
        let deployer = await prisma.deployerHistory.findUnique({
            where: { walletAddress }
        });
        if (!deployer) {
            // Create a mock deployer for demonstration if not found
            deployer = await prisma.deployerHistory.create({
                data: {
                    walletAddress,
                    totalLaunches: Math.floor(Math.random() * 10),
                    ruggedLaunches: Math.floor(Math.random() * 3),
                    walletAgeDays: Math.floor(Math.random() * 100),
                    riskScore: 65,
                    riskLevel: "watch",
                    fundingSource: "CEX",
                }
            });
        }
        return {
            score: deployer.riskScore,
            level: deployer.riskLevel,
            summary: `Deployer has ${deployer.totalLaunches} previous launches, ${deployer.ruggedLaunches} rugs. Wallet is ${deployer.walletAgeDays} days old.`,
            checks: [
                {
                    name: "Rug History",
                    status: deployer.ruggedLaunches > 0 ? "fail" : "pass",
                    detail: `${deployer.ruggedLaunches} past rugs detected.`,
                    weight: 40
                },
                {
                    name: "Wallet Age",
                    status: deployer.walletAgeDays > 30 ? "pass" : "warn",
                    detail: `Wallet is ${deployer.walletAgeDays} days old.`,
                    weight: 20
                }
            ],
            evidence: {
                websiteCaFound: false,
                githubCaFound: false,
                xCaFound: false
            }
        };
    }
    catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Failed to audit developer reputation' });
    }
});
app.get('/v1/risk/token/:mint', async (request, reply) => {
    try {
        const { mint } = request.params;
        // In a real implementation:
        // 1. Fetch mint authority / freeze authority via Helius RPC
        // 2. Fetch top 10 token holders via Helius getTokenLargestAccounts
        // 3. Simulate buy/sell via Jupiter Quote API to detect honeypot (100% sell tax or revert)
        // Simulation:
        const isMintRevoked = true;
        const isFreezeRevoked = true;
        const top10Concentration = Math.floor(Math.random() * 40) + 10; // 10% to 50%
        const jupiterSimSuccess = Math.random() > 0.1; // 10% chance of failing simulated sell
        let score = 100;
        const warnings = [];
        if (!isMintRevoked) {
            score -= 30;
            warnings.push("Mint authority NOT revoked.");
        }
        if (!isFreezeRevoked) {
            score -= 30;
            warnings.push("Freeze authority NOT revoked.");
        }
        if (top10Concentration > 30) {
            score -= 20;
            warnings.push(`Top 10 holds ${top10Concentration}% of supply.`);
        }
        if (!jupiterSimSuccess) {
            score -= 50;
            warnings.push("Honeypot risk: Jupiter sell route failed simulation.");
        }
        if (score < 0)
            score = 0;
        return {
            mint,
            score,
            level: score >= 80 ? "low" : score >= 50 ? "medium" : "high",
            warnings,
            details: {
                mintRevoked: isMintRevoked,
                freezeRevoked: isFreezeRevoked,
                top10Concentration,
                honeypotSimulated: !jupiterSimSuccess
            }
        };
    }
    catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Failed to scan token risk' });
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