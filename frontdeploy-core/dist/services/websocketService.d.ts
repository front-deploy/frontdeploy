import type { FastifyInstance } from 'fastify';
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
export declare class WebSocketService {
    private app;
    private connections;
    constructor(app: FastifyInstance);
    registerRoutes(): void;
    broadcastEvent(event: KolEventPayload): void;
}
//# sourceMappingURL=websocketService.d.ts.map