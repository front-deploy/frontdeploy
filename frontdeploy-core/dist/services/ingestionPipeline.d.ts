import type { FastifyBaseLogger } from 'fastify';
import type { WebSocketService } from './websocketService.js';
import type { TweetSource } from './tweetSource.js';
export declare class IngestionPipeline {
    private source;
    private wsService;
    private logger;
    private pollIntervalMs;
    private isRunning;
    private intervalId;
    private globalSinceId;
    private processedTweetIds;
    private handleCategories;
    constructor(source: TweetSource, wsService: WebSocketService, logger: FastifyBaseLogger, pollIntervalMs?: number);
    start(): Promise<void>;
    stop(): void;
    private runIteration;
    private processTweet;
}
//# sourceMappingURL=ingestionPipeline.d.ts.map