import type { FastifyBaseLogger } from 'fastify';
import type { TweetEvent, TweetSource } from './tweetSource.js';
export declare class TwitterApiIoSource implements TweetSource {
    private logger;
    private apiKey;
    private baseUrl;
    constructor(logger: FastifyBaseLogger);
    pollSince(accounts: string[], sinceId?: string): Promise<TweetEvent[]>;
}
//# sourceMappingURL=twitterApiIoSource.d.ts.map