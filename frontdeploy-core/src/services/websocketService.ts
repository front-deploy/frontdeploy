import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import { FlowClassifier } from './flowClassifier.js';

const prisma = new PrismaClient();

export interface KolEventPayload {
  tweetId: string;
  authorHandle: string;
  text: string;
  url: string;
  isSignal: boolean;
  contractAddress?: string | null;
  ticker?: string | null;
  postedAt: string | Date;
}

export class WebSocketService {
  private connections: Set<WebSocket> = new Set();
  private tokenSubscriptions: Map<string, Set<WebSocket>> = new Map();
  private flowClassifier: FlowClassifier = new FlowClassifier();

  constructor(private app: FastifyInstance) {}

  public getConnectionsCount(): number {
    return this.connections.size;
  }

  public registerRoutes() {
    this.app.get('/ws/kol-alerts', { websocket: true }, async (connection: WebSocket, req: FastifyRequest) => {
      this.app.log.info('New client connected to KOL alerts stream');
      this.connections.add(connection);

      connection.on('message', (message: string) => {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.action === 'subscribe' && payload.mint) {
            if (!this.tokenSubscriptions.has(payload.mint)) {
              this.tokenSubscriptions.set(payload.mint, new Set());
            }
            this.tokenSubscriptions.get(payload.mint)!.add(connection);
            this.app.log.info(`Client subscribed to mint: ${payload.mint}`);
            this.updateHeliusWebhook();
          } else if (payload.action === 'unsubscribe' && payload.mint) {
            if (this.tokenSubscriptions.has(payload.mint)) {
              this.tokenSubscriptions.get(payload.mint)!.delete(connection);
              this.app.log.info(`Client unsubscribed from mint: ${payload.mint}`);
              this.updateHeliusWebhook();
            }
          }
        } catch (e) {
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
        this.updateHeliusWebhook();
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
      } catch (err) {
        this.app.log.error(err, 'Failed to fetch recent events for new connection');
      }
    });
  }

  private webhookId: string | null = null;
  private async updateHeliusWebhook() {
    const mints = Array.from(this.tokenSubscriptions.keys());
    if (mints.length === 0 && !this.webhookId) return; // Nothing to do

    const apiKey = process.env.HELIUS_RPC_URL?.split('api-key=')[1];
    if (!apiKey) return;

    const webhookUrl = process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL 
      ? `${process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL.replace(/\/+$/, '')}/v1/webhooks/helius`
      : 'https://frontdeploy-production.up.railway.app/v1/webhooks/helius';

    try {
      if (!this.webhookId) {
        // Create webhook
        if (mints.length === 0) return;
        const res = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookURL: webhookUrl,
            transactionTypes: ["ANY"],
            accountAddresses: mints,
            webhookType: "enhanced"
          })
        });
        if (res.ok) {
          const data = await res.json() as any;
          this.webhookId = data.webhookID;
          this.app.log.info(`Created Helius Webhook ${this.webhookId} for mints: ${mints.join(', ')}`);
        }
      } else {
        // Update existing webhook
        const res = await fetch(`https://api.helius.xyz/v0/webhooks/${this.webhookId}?api-key=${apiKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookURL: webhookUrl,
            transactionTypes: ["ANY"],
            accountAddresses: mints.length > 0 ? mints : ["11111111111111111111111111111111"], // Helius requires at least 1 address
            webhookType: "enhanced"
          })
        });
        if (res.ok) {
          this.app.log.info(`Updated Helius Webhook ${this.webhookId} for mints: ${mints.join(', ')}`);
        }
      }
    } catch (err) {
      this.app.log.error(err, 'Failed to update Helius Webhook');
    }
  }

  public handleHeliusWebhook(events: any[]) {
    if (!Array.isArray(events)) return;

    for (const tx of events) {
      if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) continue;

      const mintsInvolved = new Set<string>();
      for (const transfer of tx.tokenTransfers) {
        mintsInvolved.add(transfer.mint);
      }

      for (const mint of mintsInvolved) {
        if (this.tokenSubscriptions.has(mint)) {
          const clients = this.tokenSubscriptions.get(mint)!;
          
          const mainAccount = tx.feePayer || "SmartWallet";
          let action = "SWAP";
          let amount = "Unknown";
          
          for (const transfer of tx.tokenTransfers) {
            if (transfer.mint === mint) {
              if (transfer.toUserAccount === mainAccount) {
                action = "BUY";
                amount = transfer.tokenAmount.toString();
              } else if (transfer.fromUserAccount === mainAccount) {
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
          const flowType = this.flowClassifier.classify(
            mint, 
            mainAccount, 
            action === "BUY" ? "BUY" : "SELL", 
            true, // isNewWallet (mocked for now, or could check db)
            parsedAmount // using actual amount as a proxy for volume since we don't have instant pricing
          );

          const flowMessage = JSON.stringify({
            type: "flow_event",
            data: {
              mint,
              type: flowType,
              volumeUsd: parsedAmount > 0 ? parsedAmount : 10, // fallback if 0 to show something
              wallet: `Wallet ...${mainAccount.substring(mainAccount.length - 4)}`,
              txSignature: tx.signature
            }
          });

          for (const client of clients) {
            if (client.readyState === 1 /* OPEN */) {
              client.send(message);
              client.send(flowMessage); // Also send flow event to subscribed clients
            }
          }
        }
      }
    }
  }

  public broadcastEvent(event: KolEventPayload) {
    const payload = JSON.stringify({ type: 'kol_event', data: event });
    for (const connection of this.connections) {
      if (connection.readyState === 1) { // WebSocket.OPEN
        connection.send(payload);
      }
    }
  }

  public broadcastRaw(event: any) {
    const payload = JSON.stringify(event);
    for (const connection of this.connections) {
      if (connection.readyState === 1) { // WebSocket.OPEN
        connection.send(payload);
      }
    }
  }
}
