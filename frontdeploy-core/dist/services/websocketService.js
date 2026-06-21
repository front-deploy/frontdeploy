import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class WebSocketService {
    app;
    connections = new Set();
    tokenSubscriptions = new Map();
    constructor(app) {
        this.app = app;
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
                    }
                    else if (payload.action === 'unsubscribe' && payload.mint) {
                        if (this.tokenSubscriptions.has(payload.mint)) {
                            this.tokenSubscriptions.get(payload.mint).delete(connection);
                            this.app.log.info(`Client unsubscribed from mint: ${payload.mint}`);
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
                    for (const client of clients) {
                        if (client.readyState === 1 /* OPEN */) {
                            client.send(message);
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
}
//# sourceMappingURL=websocketService.js.map