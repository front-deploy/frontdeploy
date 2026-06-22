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
    private flowClassifier;
    private solanaConnection;
    private mintListeners;
    private pendingSignatures;
    private batchTimer;
    constructor(app: FastifyInstance);
    getConnectionsCount(): number;
    registerRoutes(): void;
    private updateMintSubscription;
    private handleMintLog;
    private processSignatureBatch;
    handleHeliusWebhook(events: any[]): void;
    broadcastEvent(event: KolEventPayload): void;
    broadcastRaw(event: any): void;
}
//# sourceMappingURL=websocketService.d.ts.map