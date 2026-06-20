import { TwitterApi, ETwitterStreamEvent } from 'twitter-api-v2';
import type { TweetV2SingleStreamResult } from 'twitter-api-v2';
import type { FastifyBaseLogger } from 'fastify';
import { WebSocketService } from './websocketService.js';
import type { KolEventPayload } from './websocketService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TwitterStreamService {
  private client: TwitterApi;

  constructor(
    private wsService: WebSocketService,
    private logger: FastifyBaseLogger
  ) {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      this.logger.warn('TWITTER_BEARER_TOKEN is not set. Twitter stream will not start.');
    }
    
    // Fallback to empty string to prevent crash on init if missing, though it will fail on connect
    this.client = new TwitterApi(bearerToken || '');
  }

  public async connect() {
    if (!process.env.TWITTER_BEARER_TOKEN) {
      this.logger.error('Cannot connect to Twitter stream without a bearer token.');
      return;
    }

    try {
      this.logger.info('Syncing Twitter Filtered Stream rules from Watchlist...');
      const watchlist = await prisma.watchlist.findMany({ where: { enabled: true } });
      
      if (watchlist.length === 0) {
        this.logger.warn('Watchlist is empty. Listening to stream anyway, but no events will trigger.');
      } else {
        const currentRules = await this.client.v2.streamRules();
        if (currentRules.data?.length) {
          await this.client.v2.updateStreamRules({
            delete: { ids: currentRules.data.map(rule => rule.id) }
          });
        }
        
        // Chunk handles into rules (Twitter allows up to 512 chars per rule)
        // Format: "from:handle1 OR from:handle2"
        let currentRule = '';
        const newRules = [];
        for (const item of watchlist) {
          const handle = item.handle.replace('@', '');
          const addition = `from:${handle}`;
          if (currentRule.length + addition.length + 4 > 500) {
            newRules.push({ value: currentRule });
            currentRule = addition;
          } else {
            currentRule = currentRule ? `${currentRule} OR ${addition}` : addition;
          }
        }
        if (currentRule) newRules.push({ value: currentRule });
        
        await this.client.v2.updateStreamRules({ add: newRules });
        this.logger.info(`Added ${newRules.length} rules to Twitter stream covering ${watchlist.length} accounts.`);
      }

      this.logger.info('Connecting to Twitter v2 Filtered Stream...');
      
      const stream = await this.client.v2.searchStream({
        'tweet.fields': ['created_at', 'author_id', 'text', 'entities'],
        expansions: ['author_id'],
        'user.fields': ['username']
      });

      // Enable auto-reconnect
      stream.autoReconnect = true;

      stream.on(ETwitterStreamEvent.Data, (tweet: TweetV2SingleStreamResult) => {
        this.handleTweet(tweet);
      });

      stream.on(ETwitterStreamEvent.DataKeepAlive, () => {
        this.logger.debug('Twitter stream keep-alive received');
      });

      stream.on(ETwitterStreamEvent.Error, (error) => {
        this.logger.error({ err: error }, 'Twitter stream error');
      });

      this.logger.info('Successfully connected to Twitter stream');

    } catch (error) {
      this.logger.error({ err: error }, 'Failed to connect to Twitter stream');
      // In production, we'd want retry logic here
    }
  }

  private handleTweet(data: TweetV2SingleStreamResult) {
    try {
      const tweet = data.data;
      const authorId = tweet.author_id;
      
      // Find author username from includes
      const author = data.includes?.users?.find(u => u.id === authorId);
      const authorHandle = author ? author.username : 'unknown';

      this.logger.info(`New tweet from @${authorHandle}: ${tweet.text.substring(0, 50)}...`);

      // Basic regex to find Solana Contract Addresses (Base58, 32-44 chars)
      const caRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
      const cas = tweet.text.match(caRegex);
      
      // Basic regex for tickers like $TICKER
      const tickerRegex = /\$[A-Za-z0-9]+/g;
      const tickers = tweet.text.match(tickerRegex);

      const isSignal = (cas !== null && cas.length > 0) || (tickers !== null && tickers.length > 0);

      const event: KolEventPayload = {
        tweetId: tweet.id,
        authorHandle,
        text: tweet.text,
        url: `https://x.com/${authorHandle}/status/${tweet.id}`,
        isSignal,
        contractAddress: cas ? cas[0] : null,
        ticker: tickers ? tickers[0] : null,
        postedAt: tweet.created_at || new Date().toISOString()
      };

      // Push to connected extensions
      this.wsService.broadcastEvent(event);

      // TODO: Save to database (KolEvent)

    } catch (error) {
      this.logger.error({ err: error }, 'Error processing incoming tweet');
    }
  }
}
