import type { FastifyInstance } from 'fastify';
export interface KolEventPayload {
    tweetId: string;
    authorHandle: string;
    text: string;
    url: string;
    isSignal: boolean;
    contractAddress?: string | null;
    ticker?: string | null;
    category?: string;
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
    private caVerifier;
    private caVerifySubscriptions;
    private caVerifyInterval;
    constructor(app: FastifyInstance);
    getConnectionsCount(): number;
    registerRoutes(): void;
    private handleCaVerifySubscribe;
    private handleCaVerifyUnsubscribe;
    private checkCaForMint;
    private pollAllCaVerifications;
    private updateMintSubscription;
    private handleMintLog;
    private processSignatureBatchNative;
    handleHeliusWebhook(events: any[]): void;
    broadcastEvent(event: KolEventPayload): void;
    broadcastRaw(event: any): void;
}
//# sourceMappingURL=websocketService.d.ts.map