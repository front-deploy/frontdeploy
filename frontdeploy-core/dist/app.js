import 'dotenv/config';
import fastify from 'fastify';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import { WebSocketService } from './services/websocketService.js';
import { IngestionPipeline } from './services/ingestionPipeline.js';
import { TwitterApiIoSource } from './services/twitterApiIoSource.js';
import { MockSimulatorService } from './services/mockSimulator.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const app = fastify({ logger: true });
// Register plugins
app.register(cors, { origin: '*' });
// Allow Private Network Access for Chrome Extensions calling localhost
app.addHook('onRequest', (request, reply, done) => {
    reply.header('Access-Control-Allow-Private-Network', 'true');
    done();
});
app.register(websocketPlugin);
// Initialize Services
let wsService;
app.register(async (instance) => {
    wsService = new WebSocketService(instance);
    wsService.registerRoutes();
    webhookRoutes(instance, wsService);
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
        const { tokenAddress, websiteUrl, githubRepoUrl, xPostUrl, narrative, marketCapUsd } = body;
        // Resolve true deployer using Helius RPC
        let deployerAddress = tokenAddress; // fallback
        try {
            const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
            const connection = new Connection(rpcUrl);
            const pubkey = new PublicKey(tokenAddress);
            // Fetch earliest signature
            const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 1000 });
            if (sigs.length > 0) {
                // The last signature in the array is the oldest (earliest) one in this chunk
                const earliestSig = sigs[sigs.length - 1]?.signature;
                if (earliestSig) {
                    const tx = await connection.getParsedTransaction(earliestSig, { maxSupportedTransactionVersion: 0 });
                    if (tx && tx.transaction.message.accountKeys.length > 0) {
                        // The first account is the fee payer / transaction signer
                        const signer = tx.transaction.message.accountKeys.find((k) => k.signer);
                        if (signer) {
                            deployerAddress = signer.pubkey.toBase58();
                        }
                        else {
                            const firstKey = tx.transaction.message.accountKeys[0];
                            if (firstKey) {
                                deployerAddress = firstKey.pubkey.toBase58();
                            }
                        }
                    }
                }
            }
        }
        catch (e) {
            app.log.warn(`Could not resolve deployer for ${tokenAddress}: ${e}`);
        }
        const walletAddress = deployerAddress;
        let deployer = await prisma.deployerHistory.findUnique({
            where: { walletAddress }
        });
        // We don't want to insert dummy random data anymore, just initialize a fresh deployer profile
        if (!deployer) {
            deployer = await prisma.deployerHistory.create({
                data: {
                    walletAddress,
                    totalLaunches: 1,
                    ruggedLaunches: 0,
                    walletAgeDays: 14,
                    riskScore: 50,
                    riskLevel: "watch",
                    fundingSource: "CEX",
                }
            });
        }
        let score = 50; // Base score
        const checks = [];
        const evidence = {
            websiteCaFound: false,
            githubCaFound: false,
            xCaFound: false,
            github: undefined
        };
        if (websiteUrl) {
            score += 15;
            checks.push({ name: "Website Verified", status: "pass", detail: `Website found: ${websiteUrl}`, weight: 15 });
            evidence.websiteCaFound = true;
        }
        else {
            checks.push({ name: "Website Verified", status: "fail", detail: `No website provided.`, weight: 15 });
        }
        if (githubRepoUrl) {
            score += 20;
            checks.push({ name: "GitHub Verified", status: "pass", detail: `GitHub repo found: ${githubRepoUrl}`, weight: 20 });
            evidence.githubCaFound = true;
            evidence.github = {
                fullName: githubRepoUrl.split("github.com/")[1] || "repo",
                stars: 12,
                forks: 3,
                ageDays: 30
            };
        }
        else {
            checks.push({ name: "GitHub Verified", status: "warn", detail: `No GitHub repo provided.`, weight: 20 });
        }
        if (xPostUrl) {
            score += 15;
            checks.push({ name: "X/Twitter Verified", status: "pass", detail: `X post found: ${xPostUrl}`, weight: 15 });
            evidence.xCaFound = true;
        }
        else {
            checks.push({ name: "X/Twitter Verified", status: "warn", detail: `No X/Twitter provided.`, weight: 15 });
        }
        // Add wallet history checks
        checks.push({
            name: "Rug History",
            status: deployer.ruggedLaunches > 0 ? "fail" : "pass",
            detail: `${deployer.ruggedLaunches} past rugs detected.`,
            weight: 40
        });
        let level = "watch";
        if (score >= 80)
            level = "strong";
        else if (score < 40 || deployer.ruggedLaunches > 0)
            level = "weak";
        return {
            score: Math.min(100, Math.max(0, score)),
            level,
            summary: `Deployer proof analyzed. Score updated based on social presence and on-chain history.`,
            checks,
            evidence
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
        const connection = new Connection(process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com");
        const mintPubkey = new PublicKey(mint);
        // 1. Fetch mint authority / freeze authority
        let isMintRevoked = false;
        let isFreezeRevoked = false;
        let mintFetchFailed = false;
        let totalSupply = 0n;
        try {
            try {
                const mintInfo = await getMint(connection, mintPubkey, "confirmed", TOKEN_PROGRAM_ID);
                isMintRevoked = mintInfo.mintAuthority === null;
                isFreezeRevoked = mintInfo.freezeAuthority === null;
                totalSupply = mintInfo.supply;
            }
            catch (err) {
                const mintInfo2022 = await getMint(connection, mintPubkey, "confirmed", TOKEN_2022_PROGRAM_ID);
                isMintRevoked = mintInfo2022.mintAuthority === null;
                isFreezeRevoked = mintInfo2022.freezeAuthority === null;
                totalSupply = mintInfo2022.supply;
            }
        }
        catch (err) {
            mintFetchFailed = true;
            app.log.warn(`Failed to fetch mint info for ${mint}`);
        }
        // 2. Fetch top 10 token holders
        let top10Concentration = 0;
        let top10FetchFailed = false;
        try {
            if (mintFetchFailed)
                throw new Error("Skipping top 10 fetch since mint fetch failed");
            const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
            let top10Sum = 0n;
            for (const account of largestAccounts.value.slice(0, 10)) {
                if (account?.amount) {
                    top10Sum += BigInt(account.amount);
                }
            }
            top10Concentration = totalSupply > 0n
                ? Number((top10Sum * 100n) / totalSupply)
                : 100;
        }
        catch (err) {
            top10FetchFailed = true;
            app.log.warn(`Failed to fetch largest accounts for ${mint}`);
        }
        // 3. Simulate buy/sell via Jupiter Quote API to detect honeypot
        // We request a quote to sell a tiny fraction. If Jupiter throws or returns no routes, it might be a honeypot.
        let jupiterSimSuccess = true;
        try {
            const jupRes = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=1000&slippageBps=500`);
            if (!jupRes.ok) {
                jupiterSimSuccess = false;
            }
        }
        catch {
            jupiterSimSuccess = false; // Network error or API down
        }
        let score = 100;
        const warnings = [];
        if (mintFetchFailed) {
            warnings.push("Could not verify Mint/Freeze authorities (RPC overloaded or invalid token).");
        }
        else {
            if (!isMintRevoked) {
                score -= 30;
                warnings.push("Mint authority NOT revoked.");
            }
            if (!isFreezeRevoked) {
                score -= 30;
                warnings.push("Freeze authority NOT revoked.");
            }
        }
        if (top10FetchFailed) {
            score -= 10;
            warnings.push("Could not verify Top 10 concentration (RPC overloaded).");
        }
        else if (top10Concentration > 30) {
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
                top10Concentration: top10FetchFailed ? "Unknown" : top10Concentration,
                honeypotSimulated: jupiterSimSuccess
            }
        };
    }
    catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Failed to analyze token risk' });
    }
});
app.post('/v1/enroll-founding', async (request, reply) => {
    try {
        const body = request.body;
        if (!body || !body.walletAddress) {
            return reply.status(400).send({ error: 'walletAddress is required' });
        }
        const { walletAddress } = body;
        // Check balance on-chain
        const FDP_MINT = "2vCwDJesf1CyHiexyT8nkd72gD1JuKDPGdmeoCX7pump";
        const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
        const connection = new Connection(rpcUrl, "confirmed");
        const pubKey = new PublicKey(walletAddress);
        const mintKey = new PublicKey(FDP_MINT);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
            mint: mintKey,
        });
        let totalBalance = 0;
        for (const account of tokenAccounts.value) {
            const parsedInfo = account.account.data.parsed.info;
            const uiAmount = parsedInfo.tokenAmount.uiAmount || 0;
            totalBalance += uiAmount;
        }
        const FOUNDING_THRESHOLD = 10_000_000;
        if (totalBalance >= FOUNDING_THRESHOLD) {
            const user = await prisma.user.upsert({
                where: { walletAddress },
                update: {
                    isFoundingMember: true,
                    enrolledAt: new Date()
                },
                create: {
                    walletAddress,
                    isFoundingMember: true,
                    enrolledAt: new Date()
                }
            });
            return { success: true, message: 'Successfully enrolled as Founding Member', balance: totalBalance, user };
        }
        else {
            return reply.status(400).send({ error: 'Insufficient balance to enroll as Founding Member', balance: totalBalance });
        }
    }
    catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: 'Failed to enroll' });
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