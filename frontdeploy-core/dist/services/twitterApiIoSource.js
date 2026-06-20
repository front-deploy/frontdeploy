export class TwitterApiIoSource {
    logger;
    apiKey;
    baseUrl = 'https://api.twitterapi.io/twitter/tweet/advanced_search';
    constructor(logger) {
        this.logger = logger;
        this.apiKey = process.env.TWITTER_PROVIDER_KEY || '';
        if (!this.apiKey) {
            this.logger.warn('TWITTER_PROVIDER_KEY is missing! TwitterApiIoSource will fail.');
        }
    }
    async pollSince(accounts, sinceId) {
        if (!this.apiKey || accounts.length === 0)
            return [];
        // Chunking logic (same as official API): Twitter allows long queries, but let's be safe (~500 chars limit on some APIs)
        // For MVP, we will assume accounts can fit into one query string for twitterapi.io.
        // If there are many accounts, we might need multiple polls. Let's do a simple batch join for now.
        // Format: "from:handle1 OR from:handle2"
        const queryParts = accounts.map(handle => `from:${handle.replace('@', '')}`);
        let queryStr = queryParts.join(' OR ');
        // Add since_id to the query if it exists. Note: Advanced search uses `since_id:ID` operator.
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
            const data = await response.json();
            // TwitterAPI.io typically returns an array or an object containing tweets.
            // Assuming a generic Twitter API v2-like or v1.1-like response:
            // The exact schema might need tuning depending on the actual response structure of twitterapi.io.
            // Usually it's data.tweets or data.data or an array directly.
            const tweetsRaw = data.tweets || data.data || (Array.isArray(data) ? data : []);
            const events = [];
            for (const t of tweetsRaw) {
                // Extract basic data (handle variations in schemas)
                const id = t.id_str || t.id || t.rest_id;
                const text = t.full_text || t.text;
                const authorHandle = t.user?.screen_name || t.author?.userName || 'unknown';
                const authorId = t.user?.id_str || t.author?.id || 'unknown';
                const ts = t.created_at || new Date().toISOString();
                // Is it a reply?
                const isReply = !!(t.in_reply_to_status_id_str || t.is_reply);
                events.push({
                    id: id.toString(),
                    authorHandle,
                    authorId: authorId.toString(),
                    text,
                    url: `https://x.com/${authorHandle}/status/${id}`,
                    type: isReply ? 'reply' : 'tweet',
                    ts
                });
            }
            // Twitter Advanced Search "Live" might return newest first.
            // We should return them oldest first so the ingestion pipeline processes chronologically.
            return events.reverse();
        }
        catch (err) {
            this.logger.error({ err }, '[TwitterApiIoSource] Failed to poll tweets');
            return [];
        }
    }
}
//# sourceMappingURL=twitterApiIoSource.js.map