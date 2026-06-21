import type { FastifyInstance } from 'fastify';
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
export declare class WebSocketService {
    private app;
    private connections;
    private tokenSubscriptions;
    constructor(app: FastifyInstance);
    registerRoutes(): void;
    handleHeliusWebhook(events: any[]): void;
    broadcastEvent(event: KolEventPayload): void;
}
//# sourceMappingURL=websocketService.d.ts.map