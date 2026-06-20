import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';

export interface KolEventPayload {
  tweetId: string;
  authorHandle: string;
  text: string;
  url: string;
  isSignal: boolean;
  contractAddress?: string | null;
  ticker?: string | null;
  postedAt: string;
}

export class WebSocketService {
  private connections: Set<WebSocket> = new Set();

  constructor(private app: FastifyInstance) {}

  public registerRoutes() {
    this.app.get('/ws/kol-alerts', { websocket: true }, (connection: WebSocket, req: FastifyRequest) => {
      this.app.log.info('New client connected to KOL alerts stream');
      this.connections.add(connection);

      connection.on('close', () => {
        this.app.log.info('Client disconnected');
        this.connections.delete(connection);
      });

      // Send a welcome message
      connection.send(JSON.stringify({ type: 'connected', message: 'Connected to KOL Alerts Stream' }));
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
