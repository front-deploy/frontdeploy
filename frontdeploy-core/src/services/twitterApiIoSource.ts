import type { FastifyBaseLogger } from 'fastify';
import type { TweetEvent, TweetSource } from './tweetSource.js';

export class TwitterApiIoSource implements TweetSource {
  private apiKey: string;
  private baseUrl: string;

  constructor(private logger: FastifyBaseLogger) {
    this.apiKey = process.env.TWITTER_PROVIDER_KEY || '';
    this.baseUrl = process.env.TWITTER_PROVIDER_BASE_URL || 'https://api.twitterapi.io/twitter/tweet/advanced_search';
    
    if (!this.apiKey) {
      this.logger.warn('TWITTER_PROVIDER_KEY is missing! TwitterApiIoSource will fail.');
    }
  }

  public async pollSince(accounts: string[], sinceId?: string): Promise<TweetEvent[]> {
    if (!this.apiKey || accounts.length === 0) return [];

    const CHUNK_SIZE = 10;
    const allEvents: TweetEvent[] = [];

    for (let i = 0; i < accounts.length; i += CHUNK_SIZE) {
      const chunk = accounts.slice(i, i + CHUNK_SIZE);
      const queryParts = chunk.map(handle => `from:${handle.replace('@', '')}`);
      let queryStr = queryParts.join(' OR ');

      if (sinceId) {
        queryStr = `(${queryStr}) since_id:${sinceId}`;
      }

      try {
        this.logger.debug(`[TwitterApiIoSource] Polling API: query=${queryStr}`);
        const params = new URLSearchParams({
          query: queryStr,
          searchMode: 'live' // Equivalent to sorting by latest
        });

        const url = `${this.baseUrl}?${params.toString()}`;
        
        const response = await fetch(url, {
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`twitterapi.io responded with status: ${response.status}`);
        }

        const data = await response.json() as any;
        const tweetsRaw = data.tweets || data.data || (Array.isArray(data) ? data : []);

        for (const t of tweetsRaw) {
          const id = t.id_str || t.id || t.rest_id;
          const text = t.full_text || t.text;
          const authorHandle = t.user?.screen_name || t.author?.userName || 'unknown';
          const authorId = t.user?.id_str || t.author?.id || 'unknown';
          const ts = t.created_at || new Date().toISOString();
          
          const isReply = !!(t.in_reply_to_status_id_str || t.is_reply);

          allEvents.push({
            id: id.toString(),
            authorHandle,
            authorId: authorId.toString(),
            text,
            url: `https://x.com/${authorHandle}/status/${id}`,
            type: isReply ? 'reply' : 'tweet',
            ts
          });
        }
      } catch (err) {
        this.logger.error({ err }, '[TwitterApiIoSource] Failed to poll tweets for chunk');
      }
    }

    // Sort all events chronologically (oldest first) so the ingestion pipeline processes them correctly
    allEvents.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    return allEvents;
  }
}
