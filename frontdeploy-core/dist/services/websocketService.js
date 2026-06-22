import { PrismaClient } from '@prisma/client';
import { FlowClassifier } from './flowClassifier.js';
import { Connection, PublicKey } from '@solana/web3.js';
const prisma = new PrismaClient();
export class WebSocketService {
    app;
    connections = new Set();
    tokenSubscriptions = new Map();
    flowClassifier = new FlowClassifier();
    solanaConnection;
    mintListeners = new Map();
    pendingSignatures = new Set();
    batchTimer = null;
    constructor(app) {
        this.app = app;
        const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
        this.solanaConnection = new Connection(rpcUrl, 'confirmed');
    }
    getConnectionsCount() {
        return this.connections.size;
    }
    registerRoutes() {
        this.app.get('/ws/kol-alerts', { websocket: true }, async (connection, req) => {
            this.app.log.info('New client connected to KOL alerts stream');
            this.connections.add(connection);
            connection.on('message', (message) => {
                try {
                    const payload = JSON.parse(message.toString());
                    if (payload.action === 'subscribe' && payload.mint) {
                        if (!this.tokenSubscriptions.has(payload.mint)) {
                            this.tokenSubscriptions.set(payload.mint, new Set());
                        }
                        this.tokenSubscriptions.get(payload.mint).add(connection);
                        this.app.log.info(`Client subscribed to mint: ${payload.mint}`);
                        this.updateMintSubscription(payload.mint);
                    }
                    else if (payload.action === 'unsubscribe' && payload.mint) {
                        if (this.tokenSubscriptions.has(payload.mint)) {
                            this.tokenSubscriptions.get(payload.mint).delete(connection);
                            this.app.log.info(`Client unsubscribed from mint: ${payload.mint}`);
                            this.updateMintSubscription(payload.mint);
                        }
                    }
                }
                catch (e) {
                    this.app.log.error('Invalid WS message received');
                }
            });
            connection.on('close', () => {
                this.app.log.info('Client disconnected');
                this.connections.delete(connection);
                for (const [mint, subs] of this.tokenSubscriptions.entries()) {
                    subs.delete(connection);
                    if (subs.size === 0) {
                        this.tokenSubscriptions.delete(mint);
                        this.updateMintSubscription(mint);
                    }
                }
            });
            // Send a welcome message
            connection.send(JSON.stringify({ type: 'connected', message: 'Connected to KOL Alerts Stream' }));
            // Fetch and send recent events from the database so the client has immediate data
            try {
                const recentEvents = await prisma.kolEvent.findMany({
                    orderBy: { postedAt: 'desc' }, // get latest 10
                    take: 10
                });
                // Reverse to send oldest first
                recentEvents.reverse();
                for (const event of recentEvents) {
                    if (connection.readyState === 1) { // 1 == WebSocket.OPEN
                        connection.send(JSON.stringify({ type: 'kol_event', data: event }));
                    }
                }
            }
            catch (err) {
                this.app.log.error(err, 'Failed to fetch recent events for new connection');
            }
        });
        // Keep-alive ping every 30 seconds to prevent Railway/Nginx from dropping idle connections
        setInterval(() => {
            for (const connection of this.connections) {
                if (connection.readyState === 1) { // WebSocket.OPEN
                    connection.send(JSON.stringify({ type: 'ping' }));
                }
            }
        }, 30000);
    }
    updateMintSubscription(mint) {
        const hasClients = this.tokenSubscriptions.has(mint) && this.tokenSubscriptions.get(mint).size > 0;
        if (hasClients && !this.mintListeners.has(mint)) {
            try {
                const pubkey = new PublicKey(mint);
                const id = this.solanaConnection.onLogs(pubkey, (logs) => {
                    if (logs.err)
                        return; // Skip failed transactions
                    this.handleMintLog(logs.signature);
                }, 'confirmed');
                this.mintListeners.set(mint, id);
                this.app.log.info(`Started Solana onLogs listener for ${mint}`);
            }
            catch (e) {
                this.app.log.error(`Invalid PublicKey for mint: ${mint}`);
            }
        }
        else if (!hasClients && this.mintListeners.has(mint)) {
            const id = this.mintListeners.get(mint);
            this.solanaConnection.removeOnLogsListener(id).catch(e => this.app.log.error(e, 'Error removing log listener'));
            this.mintListeners.delete(mint);
            this.app.log.info(`Stopped Solana onLogs listener for ${mint}`);
        }
    }
    handleMintLog(signature) {
        this.pendingSignatures.add(signature);
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.processSignatureBatch(), 1000);
        }
    }
    async processSignatureBatch() {
        this.batchTimer = null;
        if (this.pendingSignatures.size === 0)
            return;
        // Helius allows up to 100 signatures per request
        const signatures = Array.from(this.pendingSignatures).slice(0, 100);
        for (const sig of signatures) {
            this.pendingSignatures.delete(sig);
        }
        try {
            const apiKey = process.env.HELIUS_RPC_URL?.split('api-key=')[1];
            if (!apiKey) {
                this.app.log.error("Missing HELIUS_RPC_URL api key for parsing transactions");
                return;
            }
            const res = await fetch(`https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: signatures })
            });
            if (res.ok) {
                const events = await res.json();
                this.handleHeliusWebhook(events);
            }
            else {
                const errText = await res.text().catch(() => res.statusText);
                this.app.log.error(`Failed to fetch parsed transactions batch: ${res.status} ${errText}`);
            }
        }
        catch (e) {
            this.app.log.error(e, "Failed to fetch parsed transactions batch");
        }
        if (this.pendingSignatures.size > 0) {
            this.batchTimer = setTimeout(() => this.processSignatureBatch(), 1000);
        }
    }
    handleHeliusWebhook(events) {
        if (!Array.isArray(events))
            return;
        for (const tx of events) {
            if (!tx.tokenTransfers || tx.tokenTransfers.length === 0)
                continue;
            const mintsInvolved = new Set();
            for (const transfer of tx.tokenTransfers) {
                mintsInvolved.add(transfer.mint);
            }
            for (const mint of mintsInvolved) {
                if (this.tokenSubscriptions.has(mint)) {
                    const clients = this.tokenSubscriptions.get(mint);
                    const mainAccount = tx.feePayer || "SmartWallet";
                    let action = "SWAP";
                    let amount = "Unknown";
                    for (const transfer of tx.tokenTransfers) {
                        if (transfer.mint === mint) {
                            if (transfer.toUserAccount === mainAccount) {
                                action = "BUY";
                                amount = transfer.tokenAmount.toString();
                            }
                            else if (transfer.fromUserAccount === mainAccount) {
                                action = "SELL";
                                amount = transfer.tokenAmount.toString();
                            }
                        }
                    }
                    const message = JSON.stringify({
                        type: "smart_money",
                        data: {
                            mint,
                            action,
                            amount,
                            walletLabel: `Wallet ...${mainAccount.substring(mainAccount.length - 4)}`,
                            txSignature: tx.signature
                        }
                    });
                    const parsedAmount = amount === "Unknown" ? 0 : parseFloat(amount);
                    // Flow Radar Classification
                    const flowType = this.flowClassifier.classify(mint, mainAccount, action === "BUY" ? "BUY" : "SELL", true, // isNewWallet (mocked for now)
                    parsedAmount);
                    const flowMessage = JSON.stringify({
                        type: "flow_event",
                        data: {
                            mint,
                            type: flowType,
                            volumeUsd: parsedAmount > 0 ? parsedAmount : 10,
                            wallet: `Wallet ...${mainAccount.substring(mainAccount.length - 4)}`,
                            txSignature: tx.signature
                        }
                    });
                    for (const client of clients) {
                        if (client.readyState === 1 /* OPEN */) {
                            client.send(message);
                            client.send(flowMessage);
                        }
                    }
                }
            }
        }
    }
    broadcastEvent(event) {
        const payload = JSON.stringify({ type: 'kol_event', data: event });
        for (const connection of this.connections) {
            if (connection.readyState === 1) { // WebSocket.OPEN
                connection.send(payload);
            }
        }
    }
    broadcastRaw(event) {
        const payload = JSON.stringify(event);
        for (const connection of this.connections) {
            if (connection.readyState === 1) { // WebSocket.OPEN
                connection.send(payload);
            }
        }
    }
}
//# sourceMappingURL=websocketService.js.map