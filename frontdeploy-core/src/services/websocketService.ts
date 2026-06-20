import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';

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

  constructor(private app: FastifyInstance) {}

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
            
            // Simulate initial smart money feed for testing
            setTimeout(() => {
              if (connection.readyState === 1) {
                connection.send(JSON.stringify({
                  type: 'smart_money',
                  data: {
                    mint: payload.mint,
                    action: 'BUY',
                    amount: '150.5 SOL',
                    walletLabel: 'Whale'
                  }
                }));
              }
            }, 2000);
          } else if (payload.action === 'unsubscribe' && payload.mint) {
            if (this.tokenSubscriptions.has(payload.mint)) {
              this.tokenSubscriptions.get(payload.mint)!.delete(connection);
              this.app.log.info(`Client unsubscribed from mint: ${payload.mint}`);
            }
          }
        } catch (e) {
          this.app.log.error('Invalid WS message received');
        }
      });

      connection.on('close', () => {
        this.app.log.info('Client disconnected');
        this.connections.delete(connection);
        
        // Remove from all subscriptions
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
      } catch (err) {
        this.app.log.error(err, 'Failed to fetch recent events for new connection');
      }
    });
  }

  public broadcastEvent(event: KolEventPayload) {
    const payload = JSON.stringify({ type: 'kol_event', data: event });
    for (const connection of this.connections) {
      if (connection.readyState === 1) { // WebSocket.OPEN
        connection.send(payload);
      }
    }
  }
}
