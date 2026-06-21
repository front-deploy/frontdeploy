import type { FastifyBaseLogger } from 'fastify';
import { PrismaClient } from '@prisma/client';
import type { WebSocketService, KolEventPayload } from './websocketService.js';
import type { TweetSource, TweetEvent } from './tweetSource.js';

const prisma = new PrismaClient();

export class IngestionPipeline {
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  // A simple in-memory map to track the latest tweet ID we have seen for the global query
  // Wait, twitter advanced search uses a global since_id which applies to the whole query
  private globalSinceId: string | undefined = undefined;
  // Fallback memory deduper in case sinceId is ignored by the provider
  private processedTweetIds = new Set<string>();

  constructor(
    private source: TweetSource,
    private wsService: WebSocketService,
    private logger: FastifyBaseLogger,
    private pollIntervalMs: number = 10000
  ) {}

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.info(`Starting IngestionPipeline (Polling every ${this.pollIntervalMs / 1000}s)`);

    // Perform an initial quick run immediately
    await this.runIteration();

    this.intervalId = setInterval(() => {
      this.runIteration();
    }, this.pollIntervalMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.info('Stopped IngestionPipeline');
  }

  private async runIteration() {
    try {
      // 1. Fetch Watchlist
      const watchlist = await prisma.watchlist.findMany({ where: { enabled: true } });
      if (watchlist.length === 0) {
        return; // Nothing to do
      }

      const accounts = watchlist.map((item: { handle: string }) => item.handle);

      // 2. Poll Source
      if (this.wsService.getConnectionsCount() === 0) {
        return; // Skip polling if no one is viewing the KOL Live feed
      }

      const newTweets = await this.source.pollSince(accounts, this.globalSinceId);

      if (newTweets.length > 0) {
        // Update globalSinceId to the most recent tweet ID (which is the last one since we reversed it)
        const latestTweet = newTweets[newTweets.length - 1];
        if (latestTweet && latestTweet.id) {
          this.globalSinceId = latestTweet.id;
        }
      }

      // 3. Process & Broadcast
      for (const tweet of newTweets) {
        if (this.processedTweetIds.has(tweet.id)) continue;
        this.processedTweetIds.add(tweet.id);
        
        // Prevent memory leak
        if (this.processedTweetIds.size > 5000) {
          const firstItem = this.processedTweetIds.values().next().value;
          if (firstItem) this.processedTweetIds.delete(firstItem);
        }

        this.processTweet(tweet);
      }
    } catch (err) {
      this.logger.error({ err }, '[IngestionPipeline] Error during polling iteration');
    }
  }

  private processTweet(tweet: TweetEvent) {
    this.logger.info(`New tweet from @${tweet.authorHandle}: ${tweet.text.substring(0, 50)}...`);

    // Basic regex to find Solana Contract Addresses (Base58, 32-44 chars)
    const caRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
    const cas = tweet.text.match(caRegex);
    
    // Basic regex for tickers like $TICKER
    const tickerRegex = /\$[A-Za-z0-9]+/g;
    const tickers = tweet.text.match(tickerRegex);

    const isSignal = (cas !== null && cas.length > 0) || (tickers !== null && tickers.length > 0);

    const payload: KolEventPayload = {
      tweetId: tweet.id,
      authorHandle: tweet.authorHandle,
      text: tweet.text,
      url: tweet.url,
      isSignal,
      contractAddress: cas ? cas[0] : null,
      ticker: tickers ? tickers[0] : null,
      postedAt: tweet.ts
    };

    // Push to connected extensions
    this.wsService.broadcastEvent(payload);

    // Save to database
    prisma.kolEvent.create({
      data: {
        tweetId: payload.tweetId,
        authorHandle: payload.authorHandle,
        authorUserId: tweet.authorId || '', // Fallback if missing
        text: payload.text,
        url: payload.url,
        isSignal: payload.isSignal,
        contractAddress: payload.contractAddress ?? null,
        ticker: payload.ticker ?? null,
        postedAt: payload.postedAt,
      }
    }).catch((err: any) => {
      this.logger.error({ err }, '[IngestionPipeline] Failed to save KOL event to DB');
    });
  }
}
